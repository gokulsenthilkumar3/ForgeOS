const api = process.env.FORGEOS_API_INTERNAL_URL || 'http://127.0.0.1:4000';
const shield = process.env.FORGEOS_MATHSHIELD_INTERNAL_URL || 'http://127.0.0.1:4001';

export default {
  transpilePackages: ['@forgeos/contracts'],
  async headers() {
    return [{
      source: '/:path*',
      headers: [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; base-uri 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      }],
    }];
  },
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${api}/v1/:path*` },
      { source: '/api/mathshield/:path*', destination: `${shield}/api/:path*` },
      { source: '/shield.js', destination: `${shield}/shield.js` },
    ];
  },
};
