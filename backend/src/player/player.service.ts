import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Player } from './player.models';

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayers(): Promise<Player[]> {
    return this.prisma.player.findMany({
      select: {
        playerId: true,
        fullName: true,
        position: true,
        team: true,
      },
    });
  }
}
