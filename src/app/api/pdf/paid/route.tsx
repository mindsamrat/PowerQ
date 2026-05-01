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
const SUB = "#444";
const FAINT = "#888";
const CRIMSON = "#9F1024";
const PAPER = "#FAF6EE";

const s = StyleSheet.create({
  page: { padding: 56, fontFamily: "DM Sans", fontSize: 11, color: INK, backgroundColor: "#FFFFFF" },
  label: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: GOLD, fontWeight: 700 },
  pageTitle: { fontFamily: "Playfair", fontWeight: 700, fontSize: 28, marginTop: 8, marginBottom: 14, color: INK, lineHeight: 1.1 },
  sectionHeading: { fontFamily: "Playfair", fontWeight: 700, fontSize: 15, marginTop: 16, marginBottom: 6, color: INK },
  body: { fontSize: 10.5, lineHeight: 1.7, color: SUB, marginBottom: 8 },
  bodyEmphasis: { fontSize: 11.5, lineHeight: 1.7, color: INK, marginBottom: 10, fontStyle: "italic" },
  caption: { fontSize: 9.5, lineHeight: 1.55, color: SUB, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: "#E0D9C8", marginVertical: 14 },
  watermark: { position: "absolute", bottom: 24, left: 56, right: 56, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: FAINT, textAlign: "center" },
  pageNum: { position: "absolute", bottom: 24, right: 56, fontSize: 8, color: FAINT },

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
        <Text style={s.watermark}>{watermark}</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>02</Text>
      </Page>

      {/* 3. POWER SIGNATURE */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Power Signature</Text>
        <Text style={s.pageTitle}>Four axes. One pattern. {personalName}.</Text>

        {axesOrdered.map((axis) => {
          const value = scores[axis];
          const narrative = axisNarratives[axis][bandFor(value)];
          return (
            <View key={axis} style={s.axisRow}>
              <View style={s.axisHeader}>
                <Text style={s.axisName}>{axisLabels[axis]}</Text>
                <Text style={s.axisValue}>{value}</Text>
              </View>
              <View style={s.bar}>
                <View style={{ width: `${value}%`, height: 2, backgroundColor: GOLD }} />
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>03</Text>
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
            <Text style={s.label}>Axis Deep Dive {idx + 1} of 4</Text>
            <Text style={s.pageTitle}>{axisLabels[axis]} — your score: {value}</Text>
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

            <Text style={s.watermark}>{watermark}</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>08</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>09</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>10</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>11</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>12</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>13</Text>
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
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>14</Text>
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

        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>15</Text>
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
