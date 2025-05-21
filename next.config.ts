import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'favicon.splitbee.io',
        port: '',
        pathname: '/**', // Allows any path under this hostname
      },
    ],
  },
  /* other config options here */
};

export default nextConfig;
