/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    // The internal tools moved from /dashboard to /admin; old bookmarks still land.
    return [
      { source: '/dashboard', destination: '/admin', permanent: true },
      { source: '/dashboard/coding-profiles', destination: '/admin/coding-profiles', permanent: true },
      { source: '/dashboard/coding-profiles/:program', destination: '/admin/coding-profiles?program=:program', permanent: true },
      { source: '/dashboard/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
