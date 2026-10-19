import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonce: a nonce would force every page to render dynamically. Next's
// inline bootstrap scripts therefore need 'unsafe-inline'; everything else
// is locked to this origin. Checkout leaves the site by navigation, which
// CSP does not restrict.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const noIndex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
const noStore = { key: "Cache-Control", value: "private, no-store" };
// URLs that carry a response id (and, after checkout, a payment id) must
// never leak to another site through the Referer header.
const noReferrer = { key: "Referrer-Policy", value: "no-referrer" };

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Pages only: a CSP on PDF or image responses can upset built-in viewers.
      { source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] },
      { source: "/api/:path*", headers: [noIndex] },
      { source: "/results", headers: [noIndex] },
      { source: "/paid", headers: [noIndex, noReferrer] },
      { source: "/admin/:path*", headers: [noIndex, noStore, noReferrer] },
      // Personal data: never let a shared cache hold these. The free PDF and
      // share card are built purely from their URL and set their own caching.
      { source: "/api/pdf/paid", headers: [noStore, noReferrer] },
      { source: "/api/response/:path*", headers: [noStore] },
      { source: "/api/payments/:path*", headers: [noStore] },
      { source: "/api/checkout/:path*", headers: [noStore] },
      { source: "/api/subscribe", headers: [noStore] },
      { source: "/api/health", headers: [noStore] },
    ];
  },
  // PDF + OG image routes load woff fonts via fs.readFile / file paths.
  // Next can't auto-trace those string paths, so we tell it explicitly to
  // include the woff files in the serverless bundle.
  outputFileTracingIncludes: {
    // The paid report prints the buyer's own words, so it carries every
    // script subset (Latin-ext, Cyrillic, Greek, Vietnamese, Devanagari).
    "/api/pdf/paid": [
      "./node_modules/@fontsource/playfair-display/files/*-700-normal.woff",
      "./node_modules/@fontsource/playfair-display/files/*-400-italic.woff",
      "./node_modules/@fontsource/dm-sans/files/*-400-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/*-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/*-400-italic.woff",
      "./node_modules/@fontsource/eb-garamond/files/*-400-normal.woff",
      "./node_modules/@fontsource/eb-garamond/files/*-400-italic.woff",
      "./node_modules/@fontsource/eb-garamond/files/*-600-normal.woff",
      "./node_modules/@fontsource/eb-garamond/files/*-700-normal.woff",
      "./node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff",
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
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
    ],
    "/opengraph-image": [
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
    ],
    "/twitter-image": [
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
      "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff",
    ],
  },
};

export default nextConfig;
