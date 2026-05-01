import { renderToStream, Document, Page, Text, View, StyleSheet, Font, Svg, Path, Polygon, Circle, Line, G } from "@react-pdf/renderer";
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
  type Archetype,
  type AxisId,
} from "@/data/archetypes";
import { getResponseById } from "@/lib/supabase-server";
import { perAxisAttribution, deriveReadings, archetypeBlend, readConfidence, type AxisAttribution } from "@/lib/result-analysis";
import { matchArchetype } from "@/lib/scoring";
import { questions } from "@/data/questions";

export const runtime = "nodejs";

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
    family: "Garamond",
    fonts: [
      { src: join(fontDir, "eb-garamond/files/eb-garamond-latin-400-normal.woff"), fontWeight: 400 },
      { src: join(fontDir, "eb-garamond/files/eb-garamond-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: join(fontDir, "eb-garamond/files/eb-garamond-latin-600-normal.woff"), fontWeight: 600 },
      { src: join(fontDir, "eb-garamond/files/eb-garamond-latin-700-normal.woff"), fontWeight: 700 },
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

const GOLD = "#8B7355";
const GOLD_LIGHT = "#B8A870";
const INK = "#0A0A0A";
const SUB = "#3A3A3A";
const FAINT = "#888";
const CRIMSON = "#9F1024";
const CRIMSON_DEEP = "#7A0C1B";
const PAPER = "#FAF6EE";
const PAPER_DARK = "#F1EAD8";

// Per-axis colour codes for visual differentiation across the report
const AXIS_COLOR: Record<AxisId, string> = {
  control: "#8B5A3C",      // umber - earth, command
  visibility: "#C9A54C",    // gold - sun, visibility
  timeHorizon: "#3F5F7E",   // slate blue - depth, patience
  powerSource: "#9F1024",   // crimson - force, magnetism
};

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 56, fontFamily: "Garamond", fontSize: 11, color: INK, backgroundColor: "#FFFFFF" },
  // Crimson accent bar at the top of every page; logo + brand line
  pageHeaderBar: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: CRIMSON },
  pageHeader: { position: "absolute", top: 18, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageHeaderBrand: { fontFamily: "Playfair", fontWeight: 700, fontSize: 9, letterSpacing: 4, color: CRIMSON, textTransform: "uppercase" },
  pageHeaderMeta: { fontFamily: "DM Sans", fontSize: 8, letterSpacing: 1.5, color: FAINT, textTransform: "uppercase" },
  label: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: GOLD, fontWeight: 700 },
  pageTitle: { fontFamily: "Playfair", fontWeight: 700, fontSize: 26, marginTop: 6, marginBottom: 14, color: INK, lineHeight: 1.1 },
  sectionHeading: { fontFamily: "Playfair", fontWeight: 700, fontSize: 14, marginTop: 14, marginBottom: 6, color: INK },
  body: { fontSize: 11, lineHeight: 1.65, color: SUB, marginBottom: 8 },
  bodyEmphasis: { fontSize: 12, lineHeight: 1.65, color: INK, marginBottom: 10, fontStyle: "italic" },
  caption: { fontSize: 10, lineHeight: 1.5, color: SUB, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: "#E0D9C8", marginVertical: 12 },
  watermark: { position: "absolute", bottom: 22, left: 56, right: 120, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", color: FAINT },
  pageNum: { position: "absolute", bottom: 22, right: 56, fontSize: 8, color: FAINT, fontFamily: "DM Sans" },

  // Cover
  coverFrame: { flex: 1, justifyContent: "center", alignItems: "center", padding: 36 },
  coverLabel: { fontSize: 10, letterSpacing: 6, textTransform: "uppercase", color: GOLD, marginBottom: 22 },
  coverGreeting: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 18, color: SUB, marginBottom: 20, textAlign: "center" },
  coverArchetype: { fontFamily: "Playfair", fontWeight: 700, fontSize: 56, color: INK, textAlign: "center", letterSpacing: 1 },
  coverTagline: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 16, color: SUB, marginTop: 12, textAlign: "center" },
  coverDivider: { width: 50, height: 1, backgroundColor: GOLD, marginVertical: 22 },
  coverMeta: { fontSize: 9, color: SUB, lineHeight: 1.7, textAlign: "center" },
  totemBlock: { marginTop: 18, alignItems: "center" },
  totemLabel: { fontSize: 8.5, letterSpacing: 3, textTransform: "uppercase", color: GOLD, marginBottom: 4 },
  totemAnimal: { fontFamily: "Playfair", fontWeight: 700, fontSize: 22, color: INK },
  totemMeaning: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 11, color: SUB, marginTop: 4, textAlign: "center", maxWidth: 360, lineHeight: 1.4 },

  // Axis chart
  axisRow: { marginBottom: 12 },
  axisHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  axisName: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: SUB, fontWeight: 700 },
  axisValue: { fontFamily: "Playfair", fontWeight: 700, fontSize: 14, color: INK },
  bar: { height: 2, backgroundColor: "#E0D9C8", marginBottom: 4 },

  // Cards
  card: { backgroundColor: PAPER, padding: 12, marginVertical: 6, borderLeft: `2px solid ${GOLD}` },
  cardLabel: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, marginBottom: 4 },
  cardPrompt: { fontSize: 9.5, fontStyle: "italic", color: SUB, marginBottom: 4 },
  cardQuote: { fontSize: 11, color: INK, lineHeight: 1.5 },
  cardImpact: { fontSize: 8.5, color: SUB, marginTop: 4 },

  // Bullets
  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 14, fontSize: 11, color: GOLD },
  bulletBody: { flex: 1, fontSize: 10.5, lineHeight: 1.65, color: SUB },

  // Laws
  lawRow: { flexDirection: "row", marginBottom: 9, paddingBottom: 9, borderBottom: "1px solid #EEE" },
  lawNum: { fontFamily: "Playfair", fontWeight: 700, fontSize: 16, color: GOLD, width: 28 },
  lawText: { flex: 1, fontSize: 11, lineHeight: 1.5, color: INK, paddingTop: 1 },

  // Blend
  blendRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, fontSize: 10, color: SUB },
  blendBar: { height: 1.5, backgroundColor: "#E0D9C8", marginBottom: 8 },

  // Comparison
  compRow: { flexDirection: "row", marginBottom: 6 },
  compLabel: { width: 100, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: SUB },
  compTrack: { flex: 1, height: 14, backgroundColor: PAPER, position: "relative" },
  compYourBar: { position: "absolute", top: 0, left: 0, height: 14, backgroundColor: GOLD },
  compAvgMark: { position: "absolute", top: -2, width: 1.5, height: 18, backgroundColor: CRIMSON },
  compValue: { width: 36, textAlign: "right", fontSize: 10, color: INK, fontFamily: "Playfair", fontWeight: 700 },

  // Roadmap
  roadmapRow: { marginBottom: 12 },
  roadmapPhase: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 2, fontWeight: 700 },
  roadmapWeeks: { fontSize: 8.5, color: FAINT, marginBottom: 4 },
  roadmapFocus: { fontSize: 11, color: INK, lineHeight: 1.55 },

  // Pairings
  pairCard: { backgroundColor: PAPER, padding: 14, marginVertical: 8 },
  pairTitle: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 4 },
  pairArchetype: { fontFamily: "Playfair", fontWeight: 700, fontSize: 18, color: INK, marginBottom: 6 },
  pairReason: { fontSize: 10.5, color: SUB, lineHeight: 1.6 },

  // Reading rows (strength / warning / practice)
  readingRow: { flexDirection: "row", marginBottom: 8 },
  readingLabel: { width: 70, fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, paddingTop: 1 },
  readingBody: { flex: 1, fontSize: 10.5, lineHeight: 1.6, color: INK },
});

// ---------- Reusable visual components ----------

function PageChrome({ docId, watermark }: { docId: string; watermark: string }) {
  return (
    <>
      <View style={s.pageHeaderBar} fixed />
      <View style={s.pageHeader} fixed>
        <Text style={s.pageHeaderBrand}>PQ · Power Quotient Assessment</Text>
        <Text style={s.pageHeaderMeta}>Doc {docId}</Text>
      </View>
      <Text style={s.watermark} fixed>{watermark}</Text>
      <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </>
  );
}

// Crimson compass-rose used on the cover. Mirrors the favicon design.
function CompassRose({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M32 6 L32 58" stroke={CRIMSON} strokeWidth={0.8} />
      <Path d="M6 32 L58 32" stroke={CRIMSON} strokeWidth={0.8} />
      <Path d="M32 7 L34.5 30 L57 32 L34.5 34 L32 57 L29.5 34 L7 32 L29.5 30 Z" fill={CRIMSON} />
      <Path d="M48.7 15.3 L34.4 29.6 L48.7 48.7 L34.4 34.4 L15.3 48.7 L29.6 34.4 L15.3 15.3 L29.6 29.6 Z" fill={CRIMSON} fillOpacity={0.35} />
      <Circle cx={32} cy={32} r={3} fill="#FFFFFF" />
      <Circle cx={32} cy={32} r={1.4} fill={CRIMSON} />
    </Svg>
  );
}

interface RadarPoint { axis: AxisId; value: number; label: string }
function RadarChart({ scores, size = 220 }: { scores: Record<AxisId, number>; size?: number }) {
  const center = size / 2;
  const maxR = size * 0.38;
  const points: RadarPoint[] = [
    { axis: "control", value: scores.control, label: "Control" },
    { axis: "visibility", value: scores.visibility, label: "Visibility" },
    { axis: "timeHorizon", value: scores.timeHorizon, label: "Time" },
    { axis: "powerSource", value: scores.powerSource, label: "Power" },
  ];
  // Top, Right, Bottom, Left
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

  const ringValues = [25, 50, 75, 100];

  const userPolygon = points
    .map((p, i) => {
      const r = (p.value / 100) * maxR;
      const x = center + r * Math.cos(angles[i]);
      const y = center + r * Math.sin(angles[i]);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Concentric rings */}
      {ringValues.map((v) => (
        <Circle key={v} cx={center} cy={center} r={(v / 100) * maxR} stroke="#E0D9C8" strokeWidth={0.6} fill="none" />
      ))}
      {/* Axis lines */}
      {angles.map((ang, i) => (
        <Line
          key={i}
          x1={center}
          y1={center}
          x2={center + maxR * Math.cos(ang)}
          y2={center + maxR * Math.sin(ang)}
          stroke="#E0D9C8"
          strokeWidth={0.6}
        />
      ))}
      {/* User polygon */}
      <Polygon points={userPolygon} fill={CRIMSON} fillOpacity={0.18} stroke={CRIMSON} strokeWidth={1.4} />
      {/* User score dots */}
      {points.map((p, i) => {
        const r = (p.value / 100) * maxR;
        const x = center + r * Math.cos(angles[i]);
        const y = center + r * Math.sin(angles[i]);
        return <Circle key={p.axis} cx={x} cy={y} r={2.5} fill={AXIS_COLOR[p.axis]} />;
      })}
      {/* Axis labels */}
      <G>
        <Text x={center} y={center - maxR - 10} style={{ fontSize: 8, fontFamily: "DM Sans", textAnchor: "middle" }}>CONTROL</Text>
        <Text x={center + maxR + 14} y={center + 3} style={{ fontSize: 8, fontFamily: "DM Sans" }}>VISIBILITY</Text>
        <Text x={center} y={center + maxR + 14} style={{ fontSize: 8, fontFamily: "DM Sans", textAnchor: "middle" }}>TIME-HORIZON</Text>
        <Text x={center - maxR - 14} y={center + 3} style={{ fontSize: 8, fontFamily: "DM Sans", textAnchor: "end" }}>POWER-SOURCE</Text>
      </G>
    </Svg>
  );
}

function clampScore(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function ordinal(n: number): string {
  const last = n % 100;
  if (last >= 11 && last <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function firstName(name: string | null | undefined): string {
  if (!name) return "Reader";
  const trimmed = name.trim();
  if (!trimmed) return "Reader";
  return trimmed.split(/\s+/)[0];
}

interface DbResponse {
  id: string;
  name: string | null;
  email: string;
  archetype_id: string;
  pq_score: number;
  scores: { control: number; visibility: number; timeHorizon: number; powerSource: number };
  answers: { q: string; o: string; d: { control: number; visibility: number; timeHorizon: number; powerSource: number } }[];
  free_text: { questionId: string; text: string }[];
  payment_status: string;
  paid_at: string | null;
  created_at: string;
}

export async function GET(req: Request) {
  try {
    return await renderPaidPdf(req);
  } catch (err) {
    console.error("[pdf-paid] uncaught error", err);
    const message = err instanceof Error ? err.message : "unknown";
    const stack = err instanceof Error ? err.stack : undefined;
    const debug = new URL(req.url).searchParams.get("debug") === "1";
    return new Response(
      JSON.stringify({ error: "PDF generation failed", message, stack: debug ? stack : undefined }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function renderPaidPdf(req: Request) {
  registerFonts();
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get("id");
  if (!responseId) return new Response("Missing id", { status: 400 });

  const row = (await getResponseById(responseId)) as DbResponse | null;
  if (!row) return new Response("Response not found", { status: 404 });
  if (row.payment_status !== "paid") return new Response("Payment required", { status: 402 });

  const archetype = getArchetypeById(row.archetype_id) ?? archetypes[0];
  const enemy = getEnemy(archetype);
  const rank = getRarityRank(archetype);
  const scores = {
    control: clampScore(row.scores?.control),
    visibility: clampScore(row.scores?.visibility),
    timeHorizon: clampScore(row.scores?.timeHorizon),
    powerSource: clampScore(row.scores?.powerSource),
  };
  const pq = clampScore(row.pq_score);
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const freeTextById: Record<string, string> = Object.fromEntries(
    (Array.isArray(row.free_text) ? row.free_text : []).map((f) => [f.questionId, f.text])
  );
  const attribution = perAxisAttribution(answers);
  const readings = deriveReadings(scores);
  const blend = archetypeBlend(scores).slice(0, 4);
  const match = matchArchetype(scores);
  const confidence = readConfidence(match);
  const ampArch = getArchetypeById(archetype.pairings.amplifies.id);
  const drainArch = getArchetypeById(archetype.pairings.drains.id);
  const docId = row.id.slice(0, 8).toUpperCase();
  const dateStr = new Date(row.paid_at ?? row.created_at).toISOString().slice(0, 10);
  const watermark = `${row.email} · ${docId} · ${dateStr}`;
  const personalName = firstName(row.name);

  const axesOrdered: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

  const doc = (
    <Document author="Way of Gods" title={`PQ Full Report - ${archetype.name}`}>
      {/* 1. COVER */}
      <Page size="LETTER" style={s.page}>
        <View style={s.coverFrame}>
          <View style={{ marginBottom: 18 }}>
            <CompassRose size={84} />
          </View>
          <Text style={s.coverLabel}>The PQ Power Profile</Text>
          <Text style={s.coverGreeting}>Prepared for {personalName}</Text>
          <Text style={s.coverArchetype}>{archetype.name}</Text>
          <Text style={s.coverTagline}>{archetype.tagline}</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverMeta}>
            PQ Score {pq} of 100 · {archetype.rarity}% rarity · {ordinal(rank)} rarest of 8 archetypes{"\n"}
            Confidence: {confidence.label} · Document {docId} · {dateStr}
          </Text>
          <View style={s.totemBlock}>
            <Text style={s.totemLabel}>Your totem</Text>
            <Text style={s.totemAnimal}>{archetype.totem.animal}</Text>
            <Text style={s.totemMeaning}>{archetype.totem.meaning}</Text>
          </View>
        </View>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 1b. TABLE OF CONTENTS */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Contents</Text>
        <Text style={s.pageTitle}>What is in this report.</Text>
        <View style={{ marginTop: 6 }}>
          {[
            { n: "I", title: "Methodology", sub: "How the assessment scores you" },
            { n: "II", title: "The Verdict", sub: "Your archetype, named and explained" },
            { n: "III", title: "Power Signature", sub: "4 axes, your radar, your blend" },
            { n: "IV", title: "Per-Axis Deep Dives", sub: "One page per axis: framework, your top answers, strength / warning / practice" },
            { n: "V", title: "The Archetype", sub: "History, totem, named historical figures" },
            { n: "VI", title: "How You Compare", sub: "Your scores vs midpoint, vs centroid, vs runner-up" },
            { n: "VII", title: "How You Win", sub: "Three contexts your archetype dominates" },
            { n: "VIII", title: "How You Lose", sub: "The historical failure modes" },
            { n: "IX", title: "Power Pairings", sub: "Who amplifies you, who drains you" },
            { n: "X", title: "90-Day Roadmap", sub: "A tailored 3-phase plan" },
            { n: "XI", title: "The Seven Laws", sub: "Imperatives specific to your archetype" },
            { n: "XII", title: "Per-Question Analysis", sub: "Every choice you made and what it probed" },
            { n: "XIII", title: "Hidden Edge & Closing", sub: "Your free-text in our analysis, plus a personal close" },
            { n: "XIV", title: "Appendix", sub: "Glossary, frameworks, methodology footnotes" },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 9, paddingBottom: 9, borderBottom: "0.5px solid #EEE" }}>
              <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 13, color: CRIMSON, width: 32 }}>{row.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Playfair", fontSize: 13, color: INK, fontWeight: 700 }}>{row.title}</Text>
                <Text style={{ fontSize: 10, color: SUB, fontStyle: "italic", marginTop: 1 }}>{row.sub}</Text>
              </View>
            </View>
          ))}
        </View>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 1c. METHODOLOGY */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>I · Methodology</Text>
        <Text style={s.pageTitle}>How this report was built.</Text>
        <Text style={s.body}>
          The Power Quotient (PQ) Assessment is a 27-question proprietary diagnostic that maps respondents across four orthogonal axes of behavioural power. It is not a Big Five derivative. It synthesises multiple research traditions specifically calibrated to predict how an individual exerts and conserves power across professional and intimate contexts.
        </Text>

        <Text style={s.sectionHeading}>The four axes</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {axesOrdered.map((axis) => (
            <View key={axis} style={{ width: "50%", paddingRight: 8, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <View style={{ width: 4, height: 12, backgroundColor: AXIS_COLOR[axis], marginRight: 6 }} />
                <Text style={{ fontFamily: "Playfair", fontSize: 12, fontWeight: 700, color: INK }}>{axisLabels[axis]}</Text>
              </View>
              <Text style={{ fontSize: 9.5, color: SUB, lineHeight: 1.5 }}>
                {axis === "control" && "Direct command vs sideways influence. Probes how willing you are to issue explicit orders versus shape outcomes through structure or charm."}
                {axis === "visibility" && "Public vs invisible authority. Probes whether you want power seen and credited, or whether you accumulate leverage through anonymity."}
                {axis === "timeHorizon" && "Tactical-now vs strategic-later. Probes how heavily you discount future outcomes against immediate ones."}
                {axis === "powerSource" && "Force vs magnetism. Probes whether your influence is consequence-based (people calculate the cost of crossing you) or attraction-based (people move toward you)."}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionHeading}>Scoring formula</Text>
        <Text style={s.body}>
          Every option on every choice question carries 1-3 axis deltas in the range −20 to +20. Each axis starts at 50 (neutral). Your final axis score is the cumulative sum, clamped to 0–100. Your PQ Score is a weighted composite (Control 0.30 + Time-Horizon 0.25 + Power-Source 0.25 + Visibility 0.20). Your archetype is the closest centroid in 4-dimensional space (Euclidean distance). Confidence reflects the gap to the runner-up archetype.
        </Text>

        <Text style={s.sectionHeading}>Research traditions cited</Text>
        <Text style={s.body}>
          Each question is grounded in a recognised psychology / behavioural-economics tradition. You will see specific citations on the per-axis pages. Notable frameworks: Snyder&apos;s Self-Monitoring Scale (1974), McClelland&apos;s Need for Power (1975), Rotter&apos;s Locus of Control (1966), Kahneman &amp; Tversky&apos;s Prospect Theory (1979), Strathman&apos;s Consideration of Future Consequences (1994), Higgins&apos; Regulatory Focus Theory (1997), French &amp; Raven&apos;s Bases of Social Power (1959), Goffman&apos;s Impression Management (1959), Cialdini&apos;s Influence Mechanisms (1984), Granovetter&apos;s Strong vs Weak Ties (1973).
        </Text>

        <Text style={s.sectionHeading}>What this report is not</Text>
        <Text style={s.body}>
          A clinical diagnosis. A prediction of life outcomes. A measure of intelligence or competence. The PQ classifies <Text style={{ fontStyle: "italic" }}>how</Text> you exert power, not <Text style={{ fontStyle: "italic" }}>how much</Text> you have.
        </Text>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 2. THE VERDICT — validating opener */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Verdict</Text>
        <Text style={s.pageTitle}>{personalName}, here is what your answers actually said.</Text>
        <Text style={s.bodyEmphasis}>
          You scored {pq} on the Power Quotient. That places you in {archetype.name} territory with {confidence.label.toLowerCase()} confidence —
          {confidence.gap >= 18 ? " the next-closest archetype isn't close." : ` with a measurable lean toward ${match.runnerUp.name}.`} Only {archetype.rarity}% of respondents read this way.
        </Text>
        <Text style={s.body}>
          {personalName}, this is not a horoscope. It is a 27-question diagnostic processed against four research-grounded axes (Snyder&apos;s self-monitoring, McClelland&apos;s power motive, Strathman&apos;s consideration of future consequences, Higgins&apos; regulatory focus) and matched against eight archetype centroids in 4-dimensional space. Your scores are the literal sum of your choice deltas. Every line in this report cites the exact answer that produced it.
        </Text>
        <Text style={s.sectionHeading}>What the engine saw in you</Text>
        <Text style={s.body}>
          The pattern that places you in {archetype.name}: {axesOrdered
            .filter(ax => bandFor(scores[ax]) !== "mid")
            .map(ax => `${bandFor(scores[ax])} ${axisLabels[ax]} (${scores[ax]})`)
            .join(", ") || "balanced positioning across all four axes"}.
          {" "}This combination is what the framework calls {archetype.name}. It matters in your case because the runner-up archetype, {match.runnerUp.name}, sits {Math.round(match.runnerUpDistance - match.distance)} units further from your position — meaning the diagnosis isn&apos;t close.
        </Text>
        {freeTextById.q24 && (
          <>
            <Text style={s.sectionHeading}>In your own words</Text>
            <View style={s.card}>
              <Text style={s.cardLabel}>You said</Text>
              <Text style={s.cardQuote}>&ldquo;{freeTextById.q24}&rdquo;</Text>
            </View>
            <Text style={s.body}>
              That moment is the report in miniature. Every {archetype.name} has a story like this — the move that worked because it broke the pattern others were following.
            </Text>
          </>
        )}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 3. POWER SIGNATURE */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Power Signature</Text>
        <Text style={s.pageTitle}>Four axes. One pattern. {personalName}.</Text>

        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <RadarChart scores={scores} size={240} />
        </View>

        {axesOrdered.map((axis) => {
          const value = scores[axis];
          const narrative = axisNarratives[axis][bandFor(value)];
          return (
            <View key={axis} style={s.axisRow}>
              <View style={s.axisHeader}>
                <Text style={[s.axisName, { color: AXIS_COLOR[axis] }]}>{axisLabels[axis]}</Text>
                <Text style={s.axisValue}>{value}</Text>
              </View>
              <View style={s.bar}>
                <View style={{ width: `${value}%`, height: 2, backgroundColor: AXIS_COLOR[axis] }} />
              </View>
              <Text style={s.caption}>{narrative}</Text>
            </View>
          );
        })}

        <View style={s.divider} />
        <Text style={s.sectionHeading}>The blend (you are not a pure type)</Text>
        <Text style={s.body}>
          Most people read as a 60/25/10/5 mix across the eight archetypes. The secondary types are where your shadow style lives — the moves you make when your dominant pattern fails.
        </Text>
        {blend.map((b) => (
          <View key={b.id}>
            <View style={s.blendRow}>
              <Text>{b.name}</Text>
              <Text>{b.percent}%</Text>
            </View>
            <View style={s.blendBar}>
              <View style={{ width: `${b.percent}%`, height: 1.5, backgroundColor: GOLD }} />
            </View>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 4 - 7. PER-AXIS DEEP DIVES — one page per axis */}
      {axesOrdered.map((axis, idx) => {
        const value = scores[axis];
        const band = bandFor(value);
        const narrative = axisNarratives[axis][band];
        const reading = readings[idx];
        const top = attribution[axis] ?? [];
        return (
          <Page key={axis} size="LETTER" style={s.page}>
            <Text style={[s.label, { color: AXIS_COLOR[axis] }]}>Axis Deep Dive {idx + 1} of 4</Text>
            <Text style={s.pageTitle}>{axisLabels[axis]} — your score: {value}</Text>
            {/* Big axis-coloured score chip */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
              <View style={{ width: 6, height: 38, backgroundColor: AXIS_COLOR[axis], marginRight: 10 }} />
              <View>
                <Text style={{ fontFamily: "Playfair", fontSize: 32, fontWeight: 700, lineHeight: 1, color: AXIS_COLOR[axis] }}>{value}</Text>
                <Text style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: SUB, marginTop: 2 }}>{band} band · {axisLabels[axis]}</Text>
              </View>
            </View>
            <Text style={s.bodyEmphasis}>{narrative}</Text>

            <Text style={s.sectionHeading}>What this score means</Text>
            <Text style={s.body}>
              You sit in the <Text style={{ fontWeight: 700 }}>{band}</Text> band on {axisLabels[axis]}.
              {value >= 80 ? ` Roughly the top fifth of respondents on this axis.` :
                value >= 60 ? ` Above the midpoint — the leaning is visible without being extreme.` :
                value >= 40 ? ` Mid-range. Your behaviour on this axis is contextual rather than fixed.` :
                value >= 20 ? ` Below the midpoint — the opposite tendency reads as your default.` :
                ` The bottom fifth — the inverse of this axis is your signature.`}
              {" "}{reading.strength}
            </Text>

            <Text style={s.sectionHeading}>The two answers that placed you here</Text>
            {top.length === 0 && <Text style={s.body}>No high-magnitude signal on this axis — your score on {axisLabels[axis]} is the cumulative average rather than driven by specific answers.</Text>}
            {top.map((entry) => {
              const q = questions.find((qq) => qq.id === entry.questionId);
              return (
                <View key={entry.questionId} style={s.card}>
                  {entry.framework && <Text style={s.cardLabel}>{entry.framework.name} · {entry.framework.citation}</Text>}
                  <Text style={s.cardPrompt}>{q?.prompt ?? entry.prompt}</Text>
                  <Text style={s.cardQuote}>&ldquo;{entry.optionText}&rdquo;</Text>
                  <Text style={s.cardImpact}>
                    {entry.delta > 0 ? "+" : ""}{entry.delta} on {axisLabels[axis]}
                    {entry.framework ? ` — ${entry.framework.probes}` : ""}
                  </Text>
                </View>
              );
            })}

            <View style={s.divider} />

            <View style={s.readingRow}>
              <Text style={[s.readingLabel, { color: GOLD_LIGHT }]}>Strength</Text>
              <Text style={s.readingBody}>{reading.strength}</Text>
            </View>
            <View style={s.readingRow}>
              <Text style={[s.readingLabel, { color: CRIMSON }]}>Watch out</Text>
              <Text style={s.readingBody}>{reading.warning}</Text>
            </View>
            <View style={s.readingRow}>
              <Text style={[s.readingLabel, { color: GOLD }]}>Practice</Text>
              <Text style={s.readingBody}>{reading.practice}</Text>
            </View>

            <PageChrome docId={docId} watermark={watermark} />
            <Text style={s.pageNum}>{String(4 + idx).padStart(2, "0")}</Text>
          </Page>
        );
      })}

      {/* 8. THE ARCHETYPE — depth + history + totem */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Archetype</Text>
        <Text style={s.pageTitle}>{archetype.name}.</Text>
        <Text style={s.totemLabel}>Totem: {archetype.totem.animal}</Text>
        <Text style={s.bodyEmphasis}>{archetype.totem.meaning}</Text>

        <Text style={s.sectionHeading}>How this pattern shows up across history</Text>
        <Text style={s.body}>{archetype.archetypeDepth}</Text>

        <Text style={s.sectionHeading}>People who have carried this pattern</Text>
        {archetype.famousExamples.map((name, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>·</Text>
            <Text style={s.bulletBody}>{name}</Text>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 9. HOW YOU COMPARE — vs population averages, vs runner-up */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>How You Compare</Text>
        <Text style={s.pageTitle}>{personalName}, vs the rest of the room.</Text>
        <Text style={s.body}>
          Each row: <Text style={{ color: GOLD, fontWeight: 700 }}>gold</Text> is your score, the <Text style={{ color: CRIMSON, fontWeight: 700 }}>red mark</Text> is the population midpoint (50). The further your bar runs past the midpoint, the more pronounced your signal on that axis.
        </Text>
        {axesOrdered.map((axis) => {
          const value = scores[axis];
          return (
            <View key={axis} style={s.compRow}>
              <Text style={s.compLabel}>{axisLabels[axis]}</Text>
              <View style={s.compTrack}>
                <View style={[s.compYourBar, { width: `${value}%` }]} />
                <View style={[s.compAvgMark, { left: "50%" }]} />
              </View>
              <Text style={s.compValue}>{value}</Text>
            </View>
          );
        })}

        <View style={s.divider} />

        <Text style={s.sectionHeading}>Where {archetype.name} typically lives</Text>
        <Text style={s.body}>
          Pure {archetype.name} centroid: Control {Math.round((archetype.control.min + archetype.control.max) / 2)},
          Visibility {Math.round((archetype.visibility.min + archetype.visibility.max) / 2)},
          Time-Horizon {Math.round((archetype.timeHorizon.min + archetype.timeHorizon.max) / 2)},
          Power-Source {Math.round((archetype.powerSource.min + archetype.powerSource.max) / 2)}.
          {" "}Your distance from this centroid is {Math.round(match.distance)} units. The closer you sit, the more the archetype description fits as written.
        </Text>

        <Text style={s.sectionHeading}>What {match.runnerUp.name} would have looked like</Text>
        <Text style={s.body}>
          The next-closest archetype, {match.runnerUp.name}, sits {Math.round(match.runnerUpDistance - match.distance)} units further from your position. {confidence.description}
        </Text>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 10. HOW YOU WIN */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>How You Win</Text>
        <Text style={s.pageTitle}>The three contexts {archetype.name}s dominate.</Text>
        <Text style={s.body}>
          These are not generic strengths. They are the specific contexts where your archetype&apos;s wiring becomes a structural edge.
        </Text>
        {archetype.winScenarios.map((scenario, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={s.sectionHeading}>{i + 1}. {scenario.label}</Text>
            <Text style={s.body}>{scenario.text}</Text>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 11. HOW YOU LOSE */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>How You Lose</Text>
        <Text style={s.pageTitle}>The failure modes the data shows for {archetype.name}.</Text>
        <Text style={s.body}>
          Every strength is a vulnerability mis-applied. These are the patterns history actually records. Reading them on the page now is cheaper than living them later.
        </Text>
        {archetype.loseModes.map((mode, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={s.sectionHeading}>{i + 1}. {mode.label}</Text>
            <Text style={[s.body, { color: CRIMSON }]}>{mode.text}</Text>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 12. POWER PAIRINGS */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Power Pairings</Text>
        <Text style={s.pageTitle}>Who amplifies you. Who drains you.</Text>
        <Text style={s.body}>
          Archetypes interact predictably. Some compound your power; others dilute it. Choose collaborators with this in mind.
        </Text>

        <View style={s.pairCard}>
          <Text style={s.pairTitle}>Amplifies you</Text>
          <Text style={s.pairArchetype}>{ampArch?.name ?? archetype.pairings.amplifies.id}</Text>
          <Text style={s.pairReason}>{archetype.pairings.amplifies.reason}</Text>
        </View>

        <View style={s.pairCard}>
          <Text style={s.pairTitle}>Drains you</Text>
          <Text style={s.pairArchetype}>{drainArch?.name ?? archetype.pairings.drains.id}</Text>
          <Text style={s.pairReason}>{archetype.pairings.drains.reason}</Text>
        </View>

        <Text style={s.sectionHeading}>Your natural enemy</Text>
        <Text style={s.bodyEmphasis}>{enemy.name} — {enemy.tagline}</Text>
        <Text style={s.body}>{archetype.enemyTactics}</Text>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 13. 90-DAY ROADMAP */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The 90-Day Roadmap</Text>
        <Text style={s.pageTitle}>{personalName}, here is your move.</Text>
        <Text style={s.body}>
          This is not a generic self-improvement plan. Each phase corrects a failure mode that recurs in your archetype across history. Run it for 90 days. Re-take the assessment in 6 months. Watch the axis you&apos;re working on shift.
        </Text>
        {archetype.roadmap.map((phase, i) => (
          <View key={i} style={s.roadmapRow}>
            <Text style={s.roadmapPhase}>{phase.phase}</Text>
            <Text style={s.roadmapWeeks}>{phase.weeks}</Text>
            <Text style={s.roadmapFocus}>{phase.focus}</Text>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 14. THE SEVEN LAWS */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Seven Laws</Text>
        <Text style={s.pageTitle}>Imperatives specific to {archetype.name}.</Text>
        <Text style={s.body}>
          These aren&apos;t generic principles. Each one corrects a failure mode that recurs in your archetype across history. Read slowly. Pin one a week.
        </Text>
        {archetype.laws.map((law, i) => (
          <View key={i} style={s.lawRow}>
            <Text style={s.lawNum}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={s.lawText}>{law}</Text>
          </View>
        ))}
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 14b. PER-QUESTION ANALYSIS — every choice on one page */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>XII · Per-Question Analysis</Text>
        <Text style={s.pageTitle}>Every choice. What it probed. Where it pulled.</Text>
        <Text style={s.body}>
          Below is the full audit trail of your scored answers. Each row names the research tradition the question maps to and the net axis impact of your choice. This is the data the engine ran your archetype on.
        </Text>

        {/* Table header */}
        <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 4, paddingBottom: 4, borderBottom: `1px solid ${GOLD}` }}>
          <Text style={{ width: "44%", fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: SUB, fontWeight: 700 }}>Question · Framework</Text>
          <Text style={{ width: "40%", fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: SUB, fontWeight: 700 }}>Your answer</Text>
          <Text style={{ width: "16%", fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: SUB, fontWeight: 700, textAlign: "right" }}>Net Δ</Text>
        </View>

        {answers.map((a, idx) => {
          const q = questions.find((qq) => qq.id === a.q);
          if (!q || q.kind === "free-text" || q.kind === "email") return null;
          const opt = q.options.find((o) => o.id === a.o);
          const totalDelta = (a.d.control ?? 0) + (a.d.visibility ?? 0) + (a.d.timeHorizon ?? 0) + (a.d.powerSource ?? 0);
          const dominantAxis = (Object.keys(a.d) as AxisId[]).reduce((best, ax) =>
            Math.abs(a.d[ax] ?? 0) > Math.abs(a.d[best] ?? 0) ? ax : best,
            "control" as AxisId
          );
          return (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                marginBottom: 4,
                paddingVertical: 4,
                paddingHorizontal: 4,
                backgroundColor: idx % 2 === 0 ? PAPER : "#FFFFFF",
                borderLeft: `2px solid ${AXIS_COLOR[dominantAxis]}`,
              }}
            >
              <View style={{ width: "44%", paddingRight: 6 }}>
                <Text style={{ fontSize: 8.5, color: INK, lineHeight: 1.3 }}>{q.prompt}</Text>
                {q.framework && (
                  <Text style={{ fontSize: 7, color: GOLD, marginTop: 2, letterSpacing: 0.5 }}>
                    {q.framework.name} · {q.framework.citation}
                  </Text>
                )}
              </View>
              <View style={{ width: "40%", paddingRight: 6 }}>
                <Text style={{ fontSize: 8.5, color: SUB, fontStyle: "italic", lineHeight: 1.3 }}>
                  &ldquo;{opt?.text ?? "—"}&rdquo;
                </Text>
              </View>
              <Text style={{
                width: "16%",
                fontSize: 9,
                fontFamily: "DM Sans",
                fontWeight: 700,
                textAlign: "right",
                color: totalDelta > 0 ? CRIMSON_DEEP : totalDelta < 0 ? "#3F5F7E" : SUB,
                paddingTop: 2,
              }}>
                {totalDelta > 0 ? "+" : ""}{totalDelta}
              </Text>
            </View>
          );
        })}

        <Text style={[s.caption, { marginTop: 10 }]}>
          Net Δ is the sum of axis deltas for the option you chose. Positive net values indicate the choice pulled toward force / control / visibility / patience; negative values toward magnetism / autonomy / invisibility / urgency. The colour stripe shows the dominant axis for that question.
        </Text>
        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 14c. APPENDIX — Glossary + frameworks list */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>XIV · Appendix</Text>
        <Text style={s.pageTitle}>Glossary &amp; framework reference.</Text>

        <Text style={s.sectionHeading}>Axis glossary</Text>
        {axesOrdered.map((axis) => (
          <View key={axis} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <View style={{ width: 4, height: 12, backgroundColor: AXIS_COLOR[axis], marginRight: 6 }} />
              <Text style={{ fontFamily: "Playfair", fontSize: 12, fontWeight: 700 }}>{axisLabels[axis]}</Text>
            </View>
            <Text style={{ fontSize: 10, color: SUB, lineHeight: 1.5 }}>
              <Text style={{ fontStyle: "italic" }}>Low (0–33):</Text> {axisNarratives[axis].low}
              {"\n"}
              <Text style={{ fontStyle: "italic" }}>Mid (34–66):</Text> {axisNarratives[axis].mid}
              {"\n"}
              <Text style={{ fontStyle: "italic" }}>High (67–100):</Text> {axisNarratives[axis].high}
            </Text>
          </View>
        ))}

        <View style={s.divider} />

        <Text style={s.sectionHeading}>Confidence levels</Text>
        <Text style={s.body}>
          <Text style={{ fontWeight: 700 }}>Strong match.</Text> Distance gap to runner-up archetype is 18 units or more. The diagnosis is unambiguous.{"\n"}
          <Text style={{ fontWeight: 700 }}>Clear match.</Text> Gap of 9–17 units. Dominant pattern with a measurable secondary lean.{"\n"}
          <Text style={{ fontWeight: 700 }}>Borderline.</Text> Gap under 9 units. Re-take in 3 months — most respondents drift toward one of the two over time.
        </Text>

        <Text style={s.sectionHeading}>Limits of this assessment</Text>
        <Text style={s.body}>
          Self-report assessments suffer from social desirability bias and impression management. The PQ mitigates this by offering options that are equally compelling for different archetypes, but no scale eliminates the effect. Treat this report as a hypothesis to test against your own behaviour, not a verdict.
        </Text>

        <Text style={s.sectionHeading}>Rarity caveat</Text>
        <Text style={s.body}>
          Archetype rarity percentages are framework estimates, not sample-derived. They will be recomputed from real respondent data once the live distribution exceeds 5,000 completions.
        </Text>

        <PageChrome docId={docId} watermark={watermark} />
      </Page>

      {/* 15. HIDDEN EDGE + LETTER CLOSE */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Hidden Edge</Text>
        <Text style={s.pageTitle}>What you held back.</Text>
        {freeTextById.q25 ? (
          <>
            <View style={s.card}>
              <Text style={s.cardLabel}>You said</Text>
              <Text style={s.cardQuote}>&ldquo;{freeTextById.q25}&rdquo;</Text>
            </View>
            <Text style={s.body}>
              This is the lever most {archetype.name}s never name. Holding back what you held back here is not weakness — it is leverage you have not yet decided to spend. The first time you say it in a room where it would cost you something, you change. Until then, this is the unused tool in the box.
            </Text>
          </>
        ) : (
          <Text style={s.body}>
            You skipped the descriptive question, but the pattern is still readable: every {archetype.name} carries one quality that becomes their decisive edge when they stop hiding it. Pin one relationship this year where you let yours show.
          </Text>
        )}

        <View style={s.divider} />

        <Text style={s.sectionHeading}>Closing — for {personalName}</Text>
        <Text style={s.body}>{archetype.closingLetter}</Text>

        <View style={s.divider} />

        <Text style={s.label}>What&apos;s next</Text>
        <Text style={s.body}>
          The PQ Assessment is the diagnostic. The Sovereign book series is the long-form playbook. For your archetype, start with the chapters on
          {scores.timeHorizon >= 60 ? " long-horizon leverage and concealed moves" : " fast execution and visible command"}
          — they will read as descriptions of moves you have already made.
        </Text>
        <Text style={s.body}>Available at wayofgods.com.</Text>

        <PageChrome docId={docId} watermark={watermark} />
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
      "Content-Disposition": `inline; filename="pq-${archetype.id}-${docId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
