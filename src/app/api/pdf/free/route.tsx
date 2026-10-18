import { renderToStream, Document, Page, Text, View, StyleSheet, Font, Link } from "@react-pdf/renderer";
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
import { matchArchetype } from "@/lib/scoring";
import { readConfidence } from "@/lib/result-analysis";
import { PAID_REPORT_PAGES } from "@/data/report-meta";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  tableHead: { flexDirection: "row", paddingBottom: 4, borderBottom: "1px solid #8B7355", marginTop: 6 },
  tableHeadCell: { fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#555", fontWeight: 700 },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4 },
  tableKey: { width: "45%", fontSize: 9.5, color: "#0A0A0A", fontWeight: 700 },
  tableVal: { width: "55%", fontSize: 9.5, color: "#7A0C1B", fontWeight: 700 },
  link: { fontSize: 11, color: "#9F1024", fontWeight: 700, textDecoration: "none", marginBottom: 10 },
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
  const token = (searchParams.get("token") ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
  const match = matchArchetype(scores);
  const confidence = readConfidence(match, pq);
  const ordinal = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";

  // Same nine rows, same order, for every free summary — so two people can compare.
  const glance: { k: string; v: string }[] = [
    { k: "Archetype", v: archetype.name },
    { k: "Fit", v: `${match.fit} / 100` },
    { k: "Runner-up", v: `${match.runnerUp.name} · ${match.runnerUpFit} / 100` },
    { k: "Confidence", v: confidence.label },
    { k: "PQ (Signature Definition)", v: `${pq} / 100` },
    { k: "Control", v: `${scores.control} · ${bandFor(scores.control).toUpperCase()}` },
    { k: "Visibility", v: `${scores.visibility} · ${bandFor(scores.visibility).toUpperCase()}` },
    { k: "Time-Horizon", v: `${scores.timeHorizon} · ${bandFor(scores.timeHorizon).toUpperCase()}` },
    { k: "Power-Source", v: `${scores.powerSource} · ${bandFor(scores.powerSource).toUpperCase()}` },
  ];

  const doc = (
    <Document author="Way of Gods" title={`PQ Summary - ${archetype.name}`}>
      {/* Page 1 — cover + at-a-glance table */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.label}>PQ Assessment — Free Summary</Text>
        <Text style={styles.heading}>{archetype.name}</Text>
        <Text style={styles.tagline}>{archetype.tagline}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>At a glance</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, { width: "45%" }]}>Variable</Text>
          <Text style={[styles.tableHeadCell, { width: "55%" }]}>Value</Text>
        </View>
        {glance.map((row, i) => (
          <View key={row.k} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? "#FAF6EE" : "#FFFFFF" }]}>
            <Text style={styles.tableKey}>{row.k}</Text>
            <Text style={styles.tableVal}>{row.v}</Text>
          </View>
        ))}

        <Text style={[styles.body, { marginTop: 14 }]}>
          Your archetype is the one whose direction from neutral best matches your four axis scores; Fit says how closely.
          PQ measures how sharply defined your signature is, not how much power you have — every archetype can score high.
          {" "}{archetype.name} is estimated at about {archetype.rarity}% of respondents (the {rank}{ordinal} rarest of 8; recalibrated as real responses come in).
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
          The full PQ Report is {PAID_REPORT_PAGES} pages built from your own answers: a one-page profile sheet, a deep dive on each of the four axes
          with the answers that produced the score, how {archetype.name} wins and loses, who amplifies and drains you, where your axes interact and
          where your answers contradict, the seven laws for your type, a 90-day roadmap, and every answer you gave, scored and cited.
        </Text>

        <Text style={styles.body}>
          It is generated as soon as payment is confirmed (usually within seconds) and downloads as a PDF watermarked to your email.
          Unlock it from your results page.
        </Text>
        <Link src="https://quiz.wayofgods.com/quiz" style={styles.link}>Take the assessment again: quiz.wayofgods.com</Link>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>Sovereign Doctrine</Text>
        <Text style={styles.body}>
          The PQ framework is the diagnostic; Sovereign Doctrine is the instruction manual. {archetype.doctrineHook} Start with the chapters on
          {" "}{archetype.timeHorizon.min > 50 ? "long-horizon leverage and concealed moves" : "fast execution and visible command"}
          {" "}— they will read as descriptions of moves you have already made.
        </Text>
        <Link src={`https://quiz.wayofgods.com/book?from=freepdf&archetype=${archetype.id}`} style={styles.link}>Get Sovereign Doctrine: quiz.wayofgods.com/book</Link>

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
      // Output depends only on the (clamped) query string, so the CDN can serve repeats.
      "Cache-Control": "public, max-age=3600, s-maxage=604800",
    },
  });
}
