// Shared PrismaService test double. `$transaction` supports both call forms
// used in the codebase: an array of already-started promises, and a callback
// that receives the (transaction) client — here just the same mock back.
export function createMockPrismaService() {
  const prisma: any = {
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
    },
    projection: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((arg) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    ),
  };
  return prisma;
}

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;

// Builds a Prisma-Decimal-like value (only `.toNumber()` is used by the app).
export function dec(value: number) {
  return { toNumber: () => value };
}
