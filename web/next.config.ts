import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: [], serverExternalPackages: ['@prisma/client'] };
export default config;
