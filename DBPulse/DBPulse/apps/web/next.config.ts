import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',   // required for Docker multi-stage
  transpilePackages: ['@dbpulse/shared', '@dbpulse/diff-engine'],
};

export default nextConfig;
