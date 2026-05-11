import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as any;
export const prisma = globalForPrisma.__flowboard_prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__flowboard_prisma = prisma;
export default prisma;
