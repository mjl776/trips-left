export interface MockPrismaService {
  league: { create: jest.Mock; findUnique: jest.Mock };
  player: { findMany: jest.Mock; findUnique: jest.Mock };
  roster: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  rosterPlayer: { create: jest.Mock; delete: jest.Mock; update: jest.Mock };
  playerStats: { findMany: jest.Mock; groupBy: jest.Mock };
  projection: { findMany: jest.Mock };
  $transaction: jest.Mock;
}

// Shared PrismaService test double. `$transaction` supports both call forms
// used in the codebase: an array of already-started promises, and a callback
// that receives the (transaction) client — here just the same mock back.
export function createMockPrismaService(): MockPrismaService {
  const prisma: MockPrismaService = {
    league: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    player: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roster: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    rosterPlayer: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    playerStats: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    projection: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((arg: unknown) =>
    Array.isArray(arg)
      ? Promise.all(arg)
      : (arg as (client: MockPrismaService) => unknown)(prisma),
  );
  return prisma;
}

// Builds a Prisma-Decimal-like value (only `.toNumber()` is used by the app).
export function dec(value: number) {
  return { toNumber: () => value };
}
