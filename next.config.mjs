/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    localPatterns: [
      { pathname: '/logo.png' },
    ],
  },
};

export default nextConfig;
