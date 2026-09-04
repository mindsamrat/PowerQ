import { renderToStream, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { join } from "node:path";
import React from "react";
import {
  archetypes,
  axisLabels,
  axisNarratives,
  bandFor,
  getArchetypeById,
  getEnemy,
  getRarityRank,
  type AxisId,
} from "@/data/archetypes";

export const runtime = "nodejs";

function clamp(raw: string | null, fallback = 50): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const fontDir = join(process.cwd(), "node_modules/@fontsource");
  Font.register({
    family: "Playfair",
    fonts: [
      { src: join(fontDir, "playfair-display/files/playfair-display-latin-700-normal.woff"), fontWeight: 700 },
      { src: join(fontDir, "playfair-display/files/playfair-display-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "DM Sans",
    fonts: [
      { src: join(fontDir, "dm-sans/files/dm-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: join(fontDir, "dm-sans/files/dm-sans-latin-700-normal.woff"), fontWeight: 700 },
      { src: join(fontDir, "dm-sans/files/dm-sans-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 64, fontFamily: "DM Sans", fontSize: 11, color: "#111", backgroundColor: "#FFFFFF" },
  label: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#8B7355" },
  heading: { fontFamily: "Playfair", fontWeight: 700, fontSize: 36, marginTop: 12, marginBottom: 18, color: "#0A0A0A" },
  sectionHeading: { fontFamily: "Playfair", fontWeight: 700, fontSize: 18, marginTop: 28, marginBottom: 8, color: "#0A0A0A" },
  body: { fontSize: 11, lineHeight: 1.7, color: "#333", marginBottom: 10 },
  divider: { height: 1, backgroundColor: "#E0D9C8", marginVertical: 18 },
  axisRow: { marginBottom: 14 },
  axisHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  axisName: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#555" },
  axisValue: { fontFamily: "Playfair", fontWeight: 700, fontSize: 14, color: "#0A0A0A" },
  bar: { height: 2, backgroundColor: "#E0D9C8", marginBottom: 6 },
  narrative: { fontSize: 10, lineHeight: 1.6, color: "#555" },
  tagline: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 14, color: "#555", marginBottom: 18 },
  footer: { position: "absolute", bottom: 32, left: 64, right: 64, fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "#999", textAlign: "center" },
});

function axisBarRow(axis: AxisId, value: number) {
  const narrative = axisNarratives[axis][bandFor(value)];
  return (
    <View key={axis} style={styles.axisRow}>
      <View style={styles.axisHeader}>
        <Text style={styles.axisName}>{axisLabels[axis]}</Text>
        <Text style={styles.axisValue}>{value}</Text>
      </View>
      <View style={styles.bar}>
        <View style={{ width: `${value}%`, height: 2, backgroundColor: "#8B7355" }} />
      </View>
      <Text style={styles.narrative}>{narrative}</Text>
    </View>
  );
}

export async function GET(req: Request) {
  registerFonts();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "sovereign";
  const archetype = getArchetypeById(id) ?? archetypes[0];
  const enemy = getEnemy(archetype);
  const rank = getRarityRank(archetype);
  const scores = {
    control: clamp(searchParams.get("c")),
    visibility: clamp(searchParams.get("v")),
    timeHorizon: clamp(searchParams.get("t")),
    powerSource: clamp(searchParams.get("p")),
  };
  const pq = clamp(searchParams.get("pq"));
  const token = (searchParams.get("token") ?? "").slice(0, 8).toUpperCase();

  const doc = (
    <Document author="Way of Gods" title={`PQ Summary - ${archetype.name}`}>
      {/* Page 1 — cover */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.label}>PQ Assessment — Free Summary</Text>
        <Text style={styles.heading}>{archetype.name}</Text>
        <Text style={styles.tagline}>{archetype.tagline}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>Your Position</Text>
        <Text style={styles.body}>
          Your PQ score of {pq} and your 4-axis signature place you in {archetype.name} territory.
          This archetype appears in approximately {archetype.rarity}% of assessed respondents — the{" "}
          {rank}
          {rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} rarest of 8.
        </Text>

        <Text style={styles.body}>
          The full PQ Report goes deeper: how {archetype.name} operates in love, money, leadership, conflict,
          and legacy, plus the seven laws specific to your archetype and the three failure modes that bring it
          down. This free summary is a sketch of the full map.
        </Text>

        <Text style={styles.footer}>Way of Gods · PQ Assessment · Document {token || "FREE"}</Text>
      </Page>

      {/* Page 2 — axis breakdown */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.label}>Your Power Signature</Text>
        <Text style={styles.heading}>The Four Axes</Text>

        {(Object.keys(axisLabels) as AxisId[]).map((axis) => axisBarRow(axis, scores[axis]))}

        <View style={styles.divider} />

        <Text style={styles.narrative}>
          Axes sum into archetype. But each axis also reads on its own — you can be high on visibility and
          low on control and still be formidable. The combination is what makes the pattern.
        </Text>

        <Text style={styles.footer}>Way of Gods · PQ Assessment · Document {token || "FREE"}</Text>
      </Page>

      {/* Page 3 — enemy + shadow gift */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.label}>What Beats You</Text>
        <Text style={styles.heading}>Your Natural Enemy</Text>
        <Text style={styles.body}>
          {enemy.name}. The only archetype structurally built to neutralize {archetype.name}. They operate
          on the exact axis you do not — where your strength is loud, theirs is silent; where your tempo
          is {archetype.timeHorizon.min > 50 ? "slow" : "fast"}, theirs is {enemy.timeHorizon.min > 50 ? "slow" : "fast"}.
          Learn their signature before you meet one in a fight.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>What You Must Guard Against</Text>
        <Text style={styles.body}>{archetype.shadowGift}</Text>

        <Text style={styles.footer}>Way of Gods · PQ Assessment · Document {token || "FREE"}</Text>
      </Page>

      {/* Page 4 — upsell */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.label}>Next</Text>
        <Text style={styles.heading}>The Full Report</Text>
        <Text style={styles.body}>
          The paid PQ Report is 25 pages of personalized analysis: how {archetype.name} operates in love,
          money, work, conflict, and legacy. Seven laws specific to your archetype. Three failure modes
          and the early warning signs of each. Your Hidden Edge — the quality most people underestimate
          about you, reframed as leverage.
        </Text>

        <Text style={styles.body}>
          The report is generated on demand and watermarked to your email. It arrives within one minute
          of purchase. Delivered as a PDF.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>Sovereign: The Book</Text>
        <Text style={styles.body}>
          The PQ framework is the diagnostic; the Sovereign book series is the instruction manual. For
          {" "}{archetype.name} types, start with Book I — the chapters on {archetype.timeHorizon.min > 50 ? "long-horizon leverage and concealed moves" : "fast execution and visible command"}
          will read as descriptions of moves you have already made.
        </Text>

        <Text style={styles.footer}>Way of Gods · PQ Assessment · Document {token || "FREE"}</Text>
      </Page>
    </Document>
  );

  const stream = await renderToStream(doc);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    );
    stream.on("end", () => resolve());
    stream.on("error", (err: Error) => reject(err));
  });

  return new Response(new Uint8Array(Buffer.concat(chunks)), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pq-${archetype.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
