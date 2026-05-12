import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "app.mekurureads.com",
          },
        ],
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;