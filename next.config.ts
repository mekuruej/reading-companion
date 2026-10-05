import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  async redirects() {
    return [
      {
        source: "/reading-companion",
        destination: "/books",
        permanent: false,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "app.mekurureads.com",
          },
        ],
        destination: "/books",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
