import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Generated documents are personal: never let a shared cache hold them.
      { source: "/api/pdf/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/response/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  // PDF + OG image routes load woff fonts via fs.readFile / file paths.
  // Next can't auto-trace those string paths, so we tell it explicitly to
  // include the woff files in the serverless bundle.
  outputFileTracingIncludes: {
    "/api/pdf/paid": [
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-italic.woff",
      "./node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff",
      "./node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff",
      "./node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-600-normal.woff",
      "./node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-700-normal.woff",
    ],
    "/api/pdf/free": [
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-italic.woff",
    ],
    "/api/card": [
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
    ],
  },
};

export default nextConfig;
