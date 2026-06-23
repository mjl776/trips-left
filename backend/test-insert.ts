import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';

const prisma = new PrismaClient();

prisma.testTable
  .create({ data: {} })
  .then(console.log)
  .finally(() => prisma.$disconnect());
