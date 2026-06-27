export type LineupSlotAssignment = {
  playerId: string;
  slot: string;
};

export type CreateLineupInput = {
  leagueId: string;
  assignments: LineupSlotAssignment[];
};

export type RemovePlayerInput = {
  rosterId: string;
  leagueId: string;
  playerId: string;
};

export type AddPlayerInput = {
  rosterId: string;
  leagueId: string;
  playerId: string;
  slot: string;
};

export type AddDropPlayerInput = {
  rosterId: string;
  leagueId: string;
  slot: string;
  addPlayerId: string;
  dropPlayerId: string;
};

export type SwapPlayersInput = {
  rosterId: string;
  leagueId: string;
  playerAId: string;
  playerBId: string;
};

export type GetLineupInput = {
  rosterId: string;
  leagueId: string;
}

export type RosterPlayer = {
  rosterId: string;
  leagueId: string;
  playerId: string;
  slot: string | null;
};

// Maps a roster slot to the real player positions allowed to fill it.
// `null` means no restriction (e.g. BN accepts any position).
// Slots not listed here (custom mock-league slots) are treated as unrestricted.
export const SLOT_ELIGIBILITY: Record<string, string[] | null> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  K: ['K'],
  DEF: ['DEF'],
  BN: null,
};
