import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { archetypes, axisLabels, getArchetypeById, type AxisId } from "@/data/archetypes";

export const runtime = "nodejs";

const WIDTH = 1080;
const HEIGHT = 1920;

function clamp(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "sovereign";
  const archetype = getArchetypeById(id) ?? archetypes[0];

  const scores: Record<AxisId, number> = {
    control: clamp(searchParams.get("c"), 50),
    visibility: clamp(searchParams.get("v"), 50),
    timeHorizon: clamp(searchParams.get("t"), 50),
    powerSource: clamp(searchParams.get("p"), 50),
  };

  const accent = archetype.cardAccent;

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
          backgroundColor: "#000000",
          color: "#FFFFFF",
          fontFamily: "DM Sans",
          padding: "120px 80px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 10, color: accent, textTransform: "uppercase", marginBottom: 80 }}>
            My Power Archetype
          </div>
          <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 144, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 2, lineHeight: 1 }}>
            {archetype.name.replace(/^The /, "")}
          </div>
          <div style={{ display: "flex", width: 80, height: 2, backgroundColor: accent, margin: "60px 0" }} />
          <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 40, fontStyle: "italic", color: "#D4D4D4", textAlign: "center", maxWidth: 800 }}>
            {archetype.tagline}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          {(Object.keys(axisLabels) as AxisId[]).map((axis) => {
            const value = scores[axis];
            return (
              <div key={axis} style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#888888", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                  <div style={{ display: "flex" }}>{axisLabels[axis]}</div>
                  <div style={{ display: "flex", color: "#FFFFFF", fontSize: 28 }}>{value}</div>
                </div>
                <div style={{ display: "flex", width: "100%", height: 3, backgroundColor: "#1E1E1E" }}>
                  <div style={{ display: "flex", width: `${value}%`, height: "100%", backgroundColor: accent }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 280,
              height: 280,
              borderRadius: 140,
              border: `3px solid ${accent}`,
            }}
          >
            <div style={{ display: "flex", fontSize: 26, color: accent, letterSpacing: 4, textTransform: "uppercase" }}>Top</div>
            <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 96, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, marginTop: 6 }}>
              {archetype.rarity}%
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#888888", letterSpacing: 4, textTransform: "uppercase", marginTop: 24 }}>
            of all assessed
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 34, color: "#888888", fontStyle: "italic" }}>Discover yours</div>
          <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 42, color: accent, marginTop: 6 }}>quiz.wayofgods.com</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Playfair", data: playfair, weight: 700, style: "normal" },
        { name: "DM Sans", data: dmSans, weight: 400, style: "normal" },
      ],
    }
  );
}
