/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.APP_BASE_PATH || '',
  output: 'standalone',
  images: {
    unoptimized: true,
    localPatterns: [
      { pathname: '/logo.png' },
    ],
  },
};

export default nextConfig;
