import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Compress responses
  compress: true,

  // Canonical domain redirect (non-www → www handled by Vercel, but covers direct)
  async redirects() {
    return [
      // Redirect www to apex — adjust if you prefer www
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.petborder.com" }],
        destination: "https://petborder.com/:path*",
        permanent: true,
      },
    ];
  },

  // Performance headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Long-lived cache for static assets (Next.js hashes these filenames)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  images: {
    // Agency white-label logos can be hosted on any domain
    // (user-supplied URLs stored in agencies.logo_url)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
