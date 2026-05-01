import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
