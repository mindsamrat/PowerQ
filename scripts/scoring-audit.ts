// Scoring-instrument audit: option balance, random-respondent distribution,
// latent-type recovery, confidence calibration. Run: npm run audit:scoring
import { choiceQuestions, type ChoiceQuestion } from "@/data/questions";
import { archetypes, getCentroid, type AxisId } from "@/data/archetypes";
import { calculateAxisScores, matchArchetype, computePQ, validateFixtures, type ScoredAnswer } from "@/lib/scoring";
import { readConfidence } from "@/lib/result-analysis";

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
const dOf = (o: ChoiceQuestion["options"][number]) => ({
  control: o.scores.control ?? 0, visibility: o.scores.visibility ?? 0,
  timeHorizon: o.scores.timeHorizon ?? 0, powerSource: o.scores.powerSource ?? 0,
});
const sa = (q: ChoiceQuestion, i: number): ScoredAnswer => ({ questionId: q.id, delta: dOf(q.options[i]) });
const pct = (arr: number[], p: number) => { const a = [...arr].sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

console.log("fixtures failing:", validateFixtures().length);

// Which archetype does each option point at (centred within its question)?
function optionTarget(q: ChoiceQuestion, i: number) {
  const dd = dOf(q.options[i]);
  const centred = AXES.map(ax => { const vals = q.options.map(o => dOf(o)[ax]); return dd[ax] - (Math.min(...vals) + Math.max(...vals)) / 2; });
  const n = Math.hypot(...centred) || 1; let best = "", bc = -2;
  for (const a of archetypes) { const c = getCentroid(a); const dir = AXES.map(x => c[x] - 50); const cn = Math.hypot(...dir);
    const cos = centred.reduce((s, v, k) => s + v * dir[k], 0) / (n * cn); if (cos > bc) { bc = cos; best = a.id; } }
  return { best, cos: bc };
}

console.log("\n=== OPTION TARGET BALANCE ===");
const tally: Record<string, number> = {}; const issues: string[] = [];
for (const q of choiceQuestions) {
  const t = q.options.map((_, i) => optionTarget(q, i));
  t.forEach(x => tally[x.best] = (tally[x.best] ?? 0) + 1);
  if (new Set(t.map(x => x.best)).size < 4) issues.push(`${q.id}: overlapping targets ${t.map(x => x.best.slice(0, 4)).join(",")}`);
  const spread = Object.fromEntries(AXES.map(ax => [ax, Math.max(...q.options.map(o => dOf(o)[ax])) - Math.min(...q.options.map(o => dOf(o)[ax]))]));
  const dom = AXES.reduce((b, ax) => spread[ax] > spread[b] ? ax : b, AXES[0]);
  if (dom !== q.primaryAxis) issues.push(`${q.id}: primaryAxis=${q.primaryAxis} -> ${dom}`);
}
console.log(tally); console.log(issues.length ? issues.join("\n") : "no per-question issues");

console.log("\n=== RANDOM RESPONDENTS (N=100k) ===");
{
  const N = 100000; const counts: Record<string, number> = {}; const conf = { high: 0, moderate: 0, borderline: 0 };
  const av: Record<AxisId, number[]> = { control: [], visibility: [], timeHorizon: [], powerSource: [] }; const pqs: number[] = [];
  for (let n = 0; n < N; n++) {
    const ans = choiceQuestions.map(q => sa(q, Math.floor(Math.random() * 4)));
    const s = calculateAxisScores(ans); const m = matchArchetype(s);
    const pq = computePQ(s, ans);
    counts[m.archetype.id] = (counts[m.archetype.id] ?? 0) + 1; conf[readConfidence(m, pq).level]++;
    AXES.forEach(ax => av[ax].push(s[ax])); pqs.push(pq);
  }
  console.log("share %:", Object.fromEntries(archetypes.map(a => [a.id, ((counts[a.id] ?? 0) / N * 100).toFixed(1)])));
  console.log("confidence %:", Object.fromEntries(Object.entries(conf).map(([k, v]) => [k, (v / N * 100).toFixed(1)])));
  AXES.forEach(ax => console.log(ax.padEnd(12), `mean=${mean(av[ax]).toFixed(1)} p5=${pct(av[ax], .05)} p50=${pct(av[ax], .5)} p95=${pct(av[ax], .95)}`));
  console.log("PQ mean/p5/p50/p95:", mean(pqs).toFixed(1), pct(pqs, .05), pct(pqs, .5), pct(pqs, .95));
}
{
  // gap distributions for calibration
  const gaps: number[] = []; for (let n = 0; n < 20000; n++) { const ans = choiceQuestions.map(q => sa(q, Math.floor(Math.random() * 4))); gaps.push(matchArchetype(calculateAxisScores(ans)).gap); }
  console.log("random fit-gap p50/p75/p90/p95:", pct(gaps, .5), pct(gaps, .75), pct(gaps, .9), pct(gaps, .95));
}

console.log("\n=== LATENT-TYPE RESPONDENTS: pick own-archetype option with prob p, else random ===");
for (const p of [1.0, 0.7, 0.5, 0.35]) {
  let correct = 0, total = 0; const perType: Record<string, { ok: number; n: number; pq: number[]; gap: number[] }> = {};
  const confAll = { high: 0, moderate: 0, borderline: 0 };
  const confusion: Record<string, Record<string, number>> = {};
  for (const a of archetypes) {
    perType[a.id] = { ok: 0, n: 0, pq: [], gap: [] };
    for (let n = 0; n < 4000; n++) {
      const ans = choiceQuestions.map(q => {
        const targets = q.options.map((_, i) => optionTarget(q, i).best);
        const own = targets.indexOf(a.id);
        const i = (own >= 0 && Math.random() < p) ? own : Math.floor(Math.random() * 4);
        return sa(q, i);
      });
      const s = calculateAxisScores(ans); const m = matchArchetype(s);
      perType[a.id].n++; total++; if (m.archetype.id === a.id) { perType[a.id].ok++; correct++; }
      confusion[a.id] ??= {}; confusion[a.id][m.archetype.id] = (confusion[a.id][m.archetype.id] ?? 0) + 1;
      const pq = computePQ(s, ans); perType[a.id].pq.push(pq); perType[a.id].gap.push(m.gap); confAll[readConfidence(m, pq).level]++;
    }
  }
  console.log(`p=${p}: overall recovery ${(correct / total * 100).toFixed(1)}%`, "confidence:", Object.fromEntries(Object.entries(confAll).map(([k, v]) => [k, (v / total * 100).toFixed(0) + "%"])));
  for (const a of archetypes) { const t = perType[a.id]; const top = Object.entries(confusion[a.id]).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${k}:${(v / t.n * 100).toFixed(0)}%`).join(" ");
    console.log("  ", a.id.padEnd(10), `recovered=${(t.ok / t.n * 100).toFixed(0).padStart(3)}%`, `PQ p50=${pct(t.pq, .5)}`, `gap p50=${pct(t.gap, .5).toFixed(1)}`, "->", top); }
}

console.log("\n=== PURE-TYPE SCORE VECTORS ===");
for (const a of archetypes) {
  const ans = choiceQuestions.map(q => { const t = q.options.map((_, i) => optionTarget(q, i).best); const own = t.indexOf(a.id);
    if (own >= 0) return sa(q, own);
    // pick option with best cosine toward this archetype
    let bi = 0, bc = -2; q.options.forEach((_, i) => { const dd = dOf(q.options[i]); const c = getCentroid(a); const dir = AXES.map(x => c[x] - 50);
      const cos = AXES.reduce((s, x, k) => s + dd[x] * dir[k], 0) / ((Math.hypot(...AXES.map(x => dd[x])) || 1) * Math.hypot(...dir)); if (cos > bc) { bc = cos; bi = i; } });
    return sa(q, bi); });
  const s = calculateAxisScores(ans); const m = matchArchetype(s);
  console.log(a.id.padEnd(10), AXES.map(x => String(s[x]).padStart(3)).join(" "), "->", m.archetype.id.padEnd(10), `fit=${m.fit} gap=${m.gap}`, `PQ=${computePQ(s, ans)}`);
}
