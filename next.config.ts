import type { NextConfig } from "next";
const demoHost = process.env.SHELBY_DEMO_HOST;
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", ...(demoHost ? [demoHost] : [])],
  devIndicators: demoHost ? false : undefined,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/ocr/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'",
          },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
