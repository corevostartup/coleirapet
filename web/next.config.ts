import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Evita empacotar firebase-admin no lambda da Netlify (quebra runtime com protos/binarios). */
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [{ source: "/records", destination: "/dados", permanent: true }];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org",
      },
    ],
  },
};

export default nextConfig;
