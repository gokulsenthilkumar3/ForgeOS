const api = process.env.FORGEOS_API_INTERNAL_URL || 'http://127.0.0.1:4000';
const shield = process.env.FORGEOS_MATHSHIELD_INTERNAL_URL || 'http://127.0.0.1:4001';

export default {
  transpilePackages: ['@forgeos/contracts'],
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${api}/v1/:path*` },
      { source: '/api/mathshield/:path*', destination: `${shield}/api/:path*` },
      { source: '/shield.js', destination: `${shield}/shield.js` },
    ];
  },
};
