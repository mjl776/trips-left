import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import {
  AddDropPlayerInput,
  AddPlayerInput,
  CreateLineupInput,
  GetLineupInput,
  LineupSlotAssignment,
  RemovePlayerInput,
  SLOT_ELIGIBILITY,
  SwapPlayersInput,
} from './lineup.models';
import { Prisma, RosterPlayer } from '../../generated/prisma/client';

type RosterWithLeagueAndPlayers = Prisma.RosterGetPayload<{
  include: { rosterPlayers: true; league: true };
}>;

@Injectable()
export class LineupService {
  constructor(private readonly prisma: PrismaService) {}

  async createLineup({ leagueId, name, assignments }: CreateLineupInput) {
    const league = await this.prisma.league.findUnique({ where: { leagueId } });
    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }

    await this.validateAssignments(assignments, league.rosterPositions);

    return await this.prisma.roster.create({
      data: {
        rosterId: randomUUID(),
        leagueId,
        name,
        rosterPlayers: {
          create: assignments.map(({ playerId, slot }) => ({ playerId, slot })),
        },
      },
      include: { rosterPlayers: true },
    });
  }

  async addPlayer(
    { leagueId, playerId, rosterId, slot }: AddPlayerInput,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const roster = await this.getRoster(rosterId, leagueId, client);

    if (this.findRosteredPlayer(roster.rosterPlayers, playerId)) {
      throw new BadRequestException(
        `Player ${playerId} is already on this roster`,
      );
    }

    // Check if slot has capacity
    this.assertSlotHasCapacity(roster, slot);

    // Position eligibility: the player's real position must be allowed in this slot.
    const player = await client.player.findUnique({ where: { playerId } });
    if (!player) {
      throw new BadRequestException(`Player ${playerId} does not exist`);
    }

    const allowedPositions = SLOT_ELIGIBILITY[slot];
    if (allowedPositions && !allowedPositions.includes(player.position)) {
      throw new BadRequestException(
        `Player ${playerId} (${player.position}) is not eligible for slot "${slot}"`,
      );
    }

    return await client.rosterPlayer.create({
      data: {
        rosterId,
        leagueId,
        playerId,
        slot,
      },
    });
  }

  async deletePlayer(
    { leagueId, playerId, rosterId }: RemovePlayerInput,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const roster = await this.getRoster(rosterId, leagueId, client);

    if (!this.findRosteredPlayer(roster.rosterPlayers, playerId)) {
      throw new BadRequestException(`Player ${playerId} is not on this roster`);
    }

    return await client.rosterPlayer.delete({
      where: {
        rosterId_leagueId_playerId: {
          playerId,
          leagueId,
          rosterId,
        },
      },
    });
  }

  async addDropPlayer({
    rosterId,
    leagueId,
    slot,
    addPlayerId,
    dropPlayerId,
  }: AddDropPlayerInput) {
    const roster = await this.getRoster(rosterId, leagueId);

    if (this.findRosteredPlayer(roster.rosterPlayers, addPlayerId)) {
      throw new BadRequestException(
        `Player ${addPlayerId} is already on this roster`,
      );
    }

    const isRosteredDropPlayer = this.findRosteredPlayer(
      roster.rosterPlayers,
      dropPlayerId,
    );

    // Ideally the frontend validates that you cannot drop a player that is not on your roster
    // but this line is added as a precaution because
    // the frontend has no way of verifying whether a player being dropped
    // is already on a user's roster
    if (!isRosteredDropPlayer) {
      throw new BadRequestException(
        `Player ${dropPlayerId} is not on this roster`,
      );
    }

    this.assertSlotHasCapacity(roster, slot, dropPlayerId);

    // Run as one transaction: if addPlayer fails (e.g. ineligible position), the delete
    // rolls back too, instead of leaving the roster a player short with no replacement.
    return await this.prisma.$transaction(async (tx) => {
      await this.deletePlayer(
        { leagueId, playerId: dropPlayerId, rosterId },
        tx,
      );
      return await this.addPlayer(
        { leagueId, playerId: addPlayerId, rosterId, slot },
        tx,
      );
    });
  }

  private async validateAssignments(
    assignments: LineupSlotAssignment[],
    rosterPositions: string[],
  ) {
    const playerIds = assignments.map((a) => a.playerId);
    if (new Set(playerIds).size !== playerIds.length) {
      throw new BadRequestException(
        'A player cannot be assigned to more than one slot',
      );
    }

    // Slot availability: every assigned slot must exist in the league's roster, and can't be
    // over-filled. rosterPositions can repeat (e.g. two "RB" entries), so consume as we go
    // rather than just checking set membership.
    const availableSlots = [...rosterPositions];
    for (const { slot } of assignments) {
      const index = availableSlots.indexOf(slot);
      console.log('index', slot);
      if (index === -1) {
        throw new BadRequestException(
          `Slot "${slot}" is not available in this league's roster, or has no remaining openings`,
        );
      }
      availableSlots.splice(index, 1);
    }

    // Position eligibility: a player's real position must be allowed in their assigned slot.
    const players = await this.prisma.player.findMany({
      where: { playerId: { in: playerIds } },
      select: { playerId: true, position: true },
    });

    const positionByPlayerId = new Map(
      players.map((p) => [p.playerId, p.position]),
    );

    for (const { playerId, slot } of assignments) {
      const position = positionByPlayerId.get(playerId);
      if (!position) {
        throw new BadRequestException(`Player ${playerId} does not exist`);
      }

      const allowedPositions = SLOT_ELIGIBILITY[slot];
      if (allowedPositions && !allowedPositions.includes(position)) {
        throw new BadRequestException(
          `Player ${playerId} (${position}) is not eligible for slot "${slot}"`,
        );
      }
    }
  }

  // Slot capacity: how many players already occupy this slot type on this roster,
  // versus how many the league allows (rosterPositions can repeat, e.g. two "RB" slots).
  private assertSlotHasCapacity(
    roster: RosterWithLeagueAndPlayers,
    slot: string,
    excludePlayerId?: string,
  ) {
    const slotCapacity = roster.league.rosterPositions.filter(
      (s) => s === slot,
    ).length;
    const slotOccupied = roster.rosterPlayers.filter(
      (rp) => rp.slot === slot && rp.playerId !== excludePlayerId,
    ).length;
    if (slotOccupied >= slotCapacity) {
      throw new BadRequestException(
        `Slot "${slot}" has no remaining openings on this roster`,
      );
    }
    return true;
  }

  async swapSlots({ rosterId, leagueId, playerAId, playerBId }: SwapPlayersInput) {
    const roster = await this.getRoster(rosterId, leagueId);
    const playerA = this.findRosteredPlayer(roster.rosterPlayers, playerAId);
    const playerB = this.findRosteredPlayer(roster.rosterPlayers, playerBId);

    if (!playerA || !playerB) {
      throw new BadRequestException('Both players must already be on this roster to swap slots');
    }

    return await this.prisma.$transaction([
      this.prisma.rosterPlayer.update({
        where: { rosterId_leagueId_playerId: { rosterId, leagueId, playerId: playerAId } },
        data: { slot: playerB.slot },
      }),
      this.prisma.rosterPlayer.update({
        where: { rosterId_leagueId_playerId: { rosterId, leagueId, playerId: playerBId } },
        data: { slot: playerA.slot },
      }),
    ]);
  }

  async viewLineup({ rosterId, leagueId }) {
    const roster = await this.prisma.roster.findUnique({
      where: { rosterId_leagueId: { rosterId, leagueId } },
      include: {
        rosterPlayers: {
          include: { player: true },
        },
        league: true,
      },
    });

    if (!roster) {
      throw new NotFoundException(`Roster ${rosterId} not found`);
    }

    return roster;
  }

  async deleteRoster({ rosterId, leagueId }: GetLineupInput) {
    await this.getRoster(rosterId, leagueId);

    return await this.prisma.roster.delete({
      where: { rosterId_leagueId: { rosterId, leagueId } },
    });
  }

  private async findUniqueRoster(
    rosterId: string,
    leagueId: string,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    return await client.roster.findUnique({
      where: { rosterId_leagueId: { rosterId, leagueId } },
      include: { rosterPlayers: true, league: true },
    });
  }

  private findRosteredPlayer(rosterPlayers: RosterPlayer[], playerId: string): RosterPlayer | undefined {
    return rosterPlayers.find((rp) => rp.playerId === playerId);
  }

  private async getRoster(
    rosterId: string,
    leagueId: string,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const roster = await this.findUniqueRoster(rosterId, leagueId, client);

    if (!roster) {
      throw new NotFoundException(`Roster ${rosterId} not found`);
    }

    return roster;
  }

}
