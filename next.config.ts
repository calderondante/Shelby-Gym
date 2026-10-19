import type { NextConfig } from "next";
const demoHost = process.env.SHELBY_DEMO_HOST;
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", ...(demoHost ? [demoHost] : [])],
  devIndicators: demoHost ? false : undefined,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
