// Renders the paid report for four synthetic respondents without touching Supabase.
// Run: npm run smoke:pdf   (writes PDFs to the OS temp dir and prints page counts)
import { tmpdir } from "node:os";
const outDir = tmpdir();
import { writeFileSync } from "node:fs";
import { renderPaidReport, type DbResponse } from "@/lib/paid-report";
import { choiceQuestions } from "@/data/questions";
import { archetypes, getCentroid, type AxisId } from "@/data/archetypes";
import { calculateAxisScores, matchArchetype, computePQ, type ScoredAnswer } from "@/lib/scoring";

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

function answersFor(archetypeId: string, p: number, includeTiebreakers: boolean) {
  const a = archetypes.find((x) => x.id === archetypeId)!;
  const c = getCentroid(a); const dir = AXES.map((ax) => c[ax] - 50);
  const qs = choiceQuestions.filter((q) => includeTiebreakers || q.kind !== "tiebreaker");
  return qs.map((q) => {
    const scoredOpts = q.options.map((o) => {
      const d = { control: o.scores.control ?? 0, visibility: o.scores.visibility ?? 0, timeHorizon: o.scores.timeHorizon ?? 0, powerSource: o.scores.powerSource ?? 0 };
      const cos = AXES.reduce((s, ax, i) => s + d[ax] * dir[i], 0);
      return { o, d, cos };
    });
    const best = scoredOpts.reduce((b, x) => (x.cos > b.cos ? x : b), scoredOpts[0]);
    const pick = Math.random() < p ? best : scoredOpts[Math.floor(Math.random() * 4)];
    return { q: q.id, o: pick.o.id, d: pick.d };
  });
}

async function run(label: string, archetypeId: string, p: number, tiebreakers: boolean, freeText: boolean) {
  const answers = answersFor(archetypeId, p, tiebreakers);
  const scored: ScoredAnswer[] = answers.map((x) => ({ questionId: x.q, delta: x.d }));
  const scores = calculateAxisScores(scored);
  const match = matchArchetype(scores);
  const row: DbResponse = {
    id: "11111111-2222-3333-4444-555555555555", name: "Test Person", email: "test@example.com",
    archetype_id: match.archetype.id, pq_score: computePQ(scores, scored), scores, answers,
    free_text: freeText ? [{ questionId: "q24", text: "I said nothing in the meeting and won the contract afterwards." }, { questionId: "q25", text: "Last week. I did not want to lose the room." }] : [],
    payment_status: "paid", paid_at: new Date().toISOString(), created_at: new Date().toISOString(),
  };
  const t0 = Date.now();
  const { pdf, filename } = await renderPaidReport(row);
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const out = `${outDir}/${label}.pdf`;
  writeFileSync(out, pdf);
  console.log(label.padEnd(28), `-> ${match.archetype.id.padEnd(10)} fit=${match.fit} gap=${match.gap} pq=${row.pq_score}`, `pages=${pages}`, `${(pdf.length / 1024).toFixed(0)}KB`, `${Date.now() - t0}ms`, filename);
}

(async () => {
  await run("flame-full-freetext", "flame", 0.85, true, true);
  await run("hunter-skipped-nofree", "hunter", 0.85, false, false);
  await run("diplomat-noisy", "diplomat", 0.5, true, false);
  await run("random", "sovereign", 0.0, true, true);
})().catch((e) => { console.error("PDF TEST FAILED", e); process.exit(1); });
