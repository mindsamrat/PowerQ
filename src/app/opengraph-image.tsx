import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Default social preview (WhatsApp, iMessage, Instagram DMs, X). Pages with
 * their own opengraph-image file override it; everything else inherits it.
 */
export const runtime = "nodejs";
export const alt = "PQ — The Power Quotient Assessment. 27 questions. 4 axes of power. 8 archetypes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [playfair, dmSans] = await Promise.all([
    readFile(join(process.cwd(), "node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff")),
    readFile(join(process.cwd(), "node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#080808",
          backgroundImage: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(196,30,58,0.22), transparent 60%)",
          color: "#FFFFFF",
          fontFamily: "DM Sans",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 10, color: "#E8526A", textTransform: "uppercase", marginBottom: 36 }}>
          Psychological Power Assessment
        </div>
        <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 108, fontWeight: 700, lineHeight: 1, textAlign: "center" }}>
          What is your
        </div>
        <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 108, fontWeight: 700, lineHeight: 1, textAlign: "center", marginTop: 8 }}>
          <span style={{ color: "#C41E3A" }}>Power</span>
          <span style={{ color: "rgba(255,255,255,0.45)", marginLeft: 28 }}>Archetype?</span>
        </div>
        <div style={{ display: "flex", width: 96, height: 2, backgroundColor: "rgba(196,30,58,0.6)", margin: "44px 0" }} />
        <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.75)" }}>
          27 questions · 4 axes of power · 8 archetypes
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#C9A84C", letterSpacing: 6, textTransform: "uppercase", marginTop: 48 }}>
          quiz.wayofgods.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Playfair", data: playfair, weight: 700, style: "normal" },
        { name: "DM Sans", data: dmSans, weight: 400, style: "normal" },
      ],
    }
  );
}
