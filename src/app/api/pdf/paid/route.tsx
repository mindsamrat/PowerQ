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
import { getResponseById } from "@/lib/supabase-server";
import { perAxisAttribution, deriveReadings, archetypeBlend } from "@/lib/result-analysis";
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
    ],
  });
  fontsRegistered = true;
}

const GOLD = "#8B7355";
const INK = "#0A0A0A";
const SUB = "#555";
const FAINT = "#999";
const CRIMSON = "#9F1024";

const s = StyleSheet.create({
  page: { padding: 56, fontFamily: "DM Sans", fontSize: 11, color: INK, backgroundColor: "#FFFFFF" },
  label: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: GOLD, fontWeight: 700 },
  pageTitle: { fontFamily: "Playfair", fontWeight: 700, fontSize: 28, marginTop: 8, marginBottom: 16, color: INK },
  sectionHeading: { fontFamily: "Playfair", fontWeight: 700, fontSize: 16, marginTop: 18, marginBottom: 6, color: INK },
  body: { fontSize: 10.5, lineHeight: 1.7, color: "#222", marginBottom: 8 },
  caption: { fontSize: 9, lineHeight: 1.5, color: SUB, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: "#E0D9C8", marginVertical: 14 },
  watermark: { position: "absolute", bottom: 24, left: 56, right: 56, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: FAINT, textAlign: "center" },
  pageNum: { position: "absolute", bottom: 24, right: 56, fontSize: 8, color: FAINT },

  // Cover
  coverFrame: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  coverLabel: { fontSize: 10, letterSpacing: 6, textTransform: "uppercase", color: GOLD, marginBottom: 24 },
  coverArchetype: { fontFamily: "Playfair", fontWeight: 700, fontSize: 56, color: INK, textAlign: "center", letterSpacing: 1 },
  coverTagline: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 16, color: SUB, marginTop: 14, textAlign: "center" },
  coverDivider: { width: 50, height: 1, backgroundColor: GOLD, marginVertical: 28 },
  coverMeta: { fontSize: 9, color: SUB, lineHeight: 1.7, textAlign: "center" },

  // Axis chart
  axisRow: { marginBottom: 14 },
  axisHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  axisName: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: SUB, fontWeight: 700 },
  axisValue: { fontFamily: "Playfair", fontWeight: 700, fontSize: 14, color: INK },
  bar: { height: 2, backgroundColor: "#E0D9C8", marginBottom: 4 },

  quoteCard: { backgroundColor: "#FAF6EE", padding: 12, marginVertical: 6, borderLeft: `2px solid ${GOLD}` },
  quoteFramework: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, marginBottom: 4 },
  quotePrompt: { fontSize: 9.5, fontStyle: "italic", color: SUB, marginBottom: 4 },
  quoteText: { fontSize: 11, color: INK, lineHeight: 1.5 },
  quoteImpact: { fontSize: 8.5, color: SUB, marginTop: 4 },

  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 14, fontSize: 11, color: GOLD },
  bulletBody: { flex: 1, fontSize: 10.5, lineHeight: 1.65, color: "#222" },

  lawRow: { flexDirection: "row", marginBottom: 9, paddingBottom: 9, borderBottom: "1px solid #EEE" },
  lawNum: { fontFamily: "Playfair", fontWeight: 700, fontSize: 16, color: GOLD, width: 28 },
  lawText: { flex: 1, fontSize: 11, lineHeight: 1.5, color: INK, paddingTop: 1 },

  blendRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, fontSize: 9.5, color: SUB },
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

interface DbResponse {
  id: string;
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
  registerFonts();
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get("id");
  if (!responseId) {
    return new Response("Missing id", { status: 400 });
  }

  const row = (await getResponseById(responseId)) as DbResponse | null;
  if (!row) {
    return new Response("Response not found", { status: 404 });
  }

  if (row.payment_status !== "paid") {
    return new Response("Payment required", { status: 402 });
  }

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
  const docId = row.id.slice(0, 8).toUpperCase();
  const dateStr = new Date(row.paid_at ?? row.created_at).toISOString().slice(0, 10);
  const watermark = `${row.email} · ${docId} · ${dateStr}`;

  const axesOrdered: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

  const doc = (
    <Document author="Way of Gods" title={`PQ Full Report - ${archetype.name}`}>
      {/* Page 1 - Cover */}
      <Page size="LETTER" style={s.page}>
        <View style={s.coverFrame}>
          <Text style={s.coverLabel}>PQ — Power Quotient Assessment</Text>
          <Text style={s.coverArchetype}>{archetype.name}</Text>
          <Text style={s.coverTagline}>{archetype.tagline}</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverMeta}>
            Prepared for {row.email}{"\n"}
            PQ Score {pq} · {archetype.rarity}% rare · {ordinal(rank)} rarest of 8{"\n"}
            Document {docId} · {dateStr}
          </Text>
        </View>
        <Text style={s.watermark}>{watermark}</Text>
      </Page>

      {/* Page 2 - Opening Diagnosis */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Opening Diagnosis</Text>
        <Text style={s.pageTitle}>What this reading is, and how to use it.</Text>
        <Text style={s.body}>
          This document is the personalised PQ Power Profile for {archetype.name}.
          It is not a personality test result. It is a diagnostic — the framework
          that sits behind every move you make and don&apos;t consciously notice.
          Each section quotes the answers you actually gave, names the research
          tradition behind the question, and tells you what to do with the result.
        </Text>
        {freeTextById.q24 && (
          <>
            <Text style={s.sectionHeading}>In your own words</Text>
            <View style={s.quoteCard}>
              <Text style={s.quoteFramework}>You said</Text>
              <Text style={s.quoteText}>&ldquo;{freeTextById.q24}&rdquo;</Text>
            </View>
            <Text style={s.body}>
              This is the move that tells us how you actually wield power, not how
              you describe it. The patterns below explain why this move worked.
            </Text>
          </>
        )}
        <Text style={s.sectionHeading}>How power resolves through you</Text>
        <Text style={s.body}>{archetype.archetypeDepth}</Text>
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>02</Text>
      </Page>

      {/* Page 3 - Power Signature */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Power Signature</Text>
        <Text style={s.pageTitle}>The four axes — and your position on each.</Text>

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
        <Text style={s.sectionHeading}>Where you sit, vs where you don&apos;t</Text>
        {blend.map((b) => (
          <View key={b.id} style={s.blendRow}>
            <Text>{b.name}</Text>
            <Text>{b.percent}%</Text>
          </View>
        ))}
        <Text style={s.caption}>
          You are not a pure type. Read the secondary archetype as your shadow style — the moves you make under pressure when your dominant pattern fails.
        </Text>
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>03</Text>
      </Page>

      {/* Page 4 - Per-Axis Attribution (the real data) */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>How Each Axis Was Built</Text>
        <Text style={s.pageTitle}>The exact answers that placed you where you sit.</Text>
        <Text style={s.body}>
          This is the page most reports never show. For each axis, the answer that pulled hardest toward your final score, with the research tradition the question maps to.
        </Text>

        {axesOrdered.map((axis) => {
          const top = attribution[axis]?.[0];
          if (!top) return null;
          const q = questions.find((qq) => qq.id === top.questionId);
          return (
            <View key={axis} wrap={false}>
              <Text style={s.sectionHeading}>{axisLabels[axis]} — score {scores[axis]}</Text>
              <View style={s.quoteCard}>
                {top.framework && (
                  <Text style={s.quoteFramework}>
                    {top.framework.name} · {top.framework.citation}
                  </Text>
                )}
                <Text style={s.quotePrompt}>{q?.prompt ?? top.prompt}</Text>
                <Text style={s.quoteText}>&ldquo;{top.optionText}&rdquo;</Text>
                <Text style={s.quoteImpact}>
                  {top.delta > 0 ? "+" : ""}{top.delta} on {axisLabels[axis]} · {top.framework?.probes ?? ""}
                </Text>
              </View>
            </View>
          );
        })}
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>04</Text>
      </Page>

      {/* Page 5 - Strengths */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>What You Do Well</Text>
        <Text style={s.pageTitle}>Strengths derived from your specific position.</Text>
        <Text style={s.body}>
          These aren&apos;t generic strengths. Each one is a direct read of your
          axis-band combination — the thing your particular score makes easy.
        </Text>
        {readings.map((r) => (
          <View key={r.axis} style={{ marginBottom: 14 }}>
            <Text style={s.sectionHeading}>{r.label} ({r.band})</Text>
            <Text style={s.body}>{r.strength}</Text>
          </View>
        ))}
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>05</Text>
      </Page>

      {/* Page 6 - Warnings */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Where You Lose</Text>
        <Text style={s.pageTitle}>The failure modes your axis pattern produces.</Text>
        <Text style={s.body}>
          Every strength is a vulnerability mis-applied. Below: how each of your axis positions becomes a liability if left unchecked, plus one move to neutralise it.
        </Text>
        {readings.map((r) => (
          <View key={r.axis} style={{ marginBottom: 14 }}>
            <Text style={s.sectionHeading}>{r.label}</Text>
            <Text style={[s.body, { color: CRIMSON }]}>{r.warning}</Text>
            <Text style={s.body}>
              <Text style={{ color: GOLD, fontWeight: 700 }}>Practice: </Text>
              {r.practice}
            </Text>
          </View>
        ))}
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>06</Text>
      </Page>

      {/* Page 7 - The Archetype + examples */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Archetype</Text>
        <Text style={s.pageTitle}>{archetype.name}.</Text>
        <Text style={s.body}>{archetype.archetypeDepth}</Text>
        <Text style={s.sectionHeading}>People who carried this pattern</Text>
        {archetype.famousExamples.map((name, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>·</Text>
            <Text style={s.bulletBody}>{name}</Text>
          </View>
        ))}
        <Text style={s.sectionHeading}>What you must guard against</Text>
        <Text style={s.body}>{archetype.shadowGift}</Text>
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>07</Text>
      </Page>

      {/* Page 8 - Natural Enemy */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Natural Enemy</Text>
        <Text style={s.pageTitle}>{enemy.name}.</Text>
        <Text style={s.body}>{enemy.tagline}</Text>
        <Text style={s.sectionHeading}>How to recognise them</Text>
        <Text style={s.body}>
          {enemy.signatureTraits.join(" ")}
        </Text>
        <Text style={s.sectionHeading}>How {archetype.name} survives them</Text>
        <Text style={s.body}>{archetype.enemyTactics}</Text>
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>08</Text>
      </Page>

      {/* Page 9 - 7 Laws */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>The Seven Laws</Text>
        <Text style={s.pageTitle}>Imperatives specific to {archetype.name}.</Text>
        <Text style={s.body}>
          These aren&apos;t generic principles. Each one corrects a failure mode that recurs in your archetype across history. Read them slowly. Pin one a week.
        </Text>
        {archetype.laws.map((law, i) => (
          <View key={i} style={s.lawRow}>
            <Text style={s.lawNum}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={s.lawText}>{law}</Text>
          </View>
        ))}
        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>09</Text>
      </Page>

      {/* Page 10 - Hidden Edge + What's Next */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Your Hidden Edge</Text>
        <Text style={s.pageTitle}>What people consistently underestimate.</Text>
        {freeTextById.q25 ? (
          <>
            <View style={s.quoteCard}>
              <Text style={s.quoteFramework}>You said</Text>
              <Text style={s.quoteText}>&ldquo;{freeTextById.q25}&rdquo;</Text>
            </View>
            <Text style={s.body}>
              This is the lever most {archetype.name}s never name. Holding back
              what you held back here is not weakness — it is leverage you have
              not yet decided to spend. The question isn&apos;t whether you should
              speak it. It is whether you can say it in a room where it would
              cost you something. The first time you do, you change.
            </Text>
          </>
        ) : (
          <Text style={s.body}>
            You skipped this question. The pattern is still readable: every {archetype.name}
            carries one underestimated quality that becomes their decisive
            advantage when they stop hiding it. For your archetype the most
            common form is the depth of patience you don&apos;t signal. Pin one
            relationship this year where you let it show.
          </Text>
        )}

        <View style={s.divider} />

        <Text style={s.label}>What&apos;s Next</Text>
        <Text style={s.sectionHeading}>The Sovereign book series</Text>
        <Text style={s.body}>
          The PQ Assessment is the diagnostic. The Sovereign books are the
          instruction manual — the long-form playbook for living as {archetype.name}.
          For your axis profile, start with Book I: the chapters on
          {scores.timeHorizon >= 60 ? " long-horizon leverage and concealed moves" : " fast execution and visible command"}
          will read as descriptions of moves you have already made.
        </Text>
        <Text style={s.body}>
          Available at wayofgods.com.
        </Text>

        <Text style={s.watermark}>{watermark}</Text>
        <Text style={s.pageNum}>10</Text>
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
