// Sanity check for lib/psychometrics.ts on synthetic respondents.
// Run: npm run check:psychometrics
//
// Builds two populations — consistent latent-type respondents and pure random
// clickers — and checks the analysis tells them apart: high alpha and good item
// discrimination for the first, low for the second. Exits non-zero on failure.
import { choiceQuestions } from "@/data/questions";
import { archetypes, getCentroid, type AxisId } from "@/data/archetypes";
import { calculateAxisScores, matchArchetype, computePQ, type ScoredAnswer } from "@/lib/scoring";
import { analysePsychometrics, type ResponseSample } from "@/lib/psychometrics";

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
let failures = 0;
const ok = (c: boolean, label: string, extra = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); if (!c) failures += 1; };

function respondent(p: number, i: number): ResponseSample {
  const a = archetypes[i % archetypes.length];
  const c = getCentroid(a);
  const dir = AXES.map((ax) => c[ax] - 50);
  const answers = choiceQuestions.map((q) => {
    const opts = q.options.map((o) => {
      const d = AXES.map((ax) => o.scores[ax] ?? 0);
      return { o, cos: d.reduce((s, v, k) => s + v * dir[k], 0) };
    });
    const best = opts.reduce((b, x) => (x.cos > b.cos ? x : b), opts[0]);
    const pick = Math.random() < p ? best : opts[Math.floor(Math.random() * 4)];
    return { q: q.id, o: pick.o.id, pos: Math.floor(Math.random() * 4) };
  });
  const scored: ScoredAnswer[] = answers.map((x) => {
    const q = choiceQuestions.find((qq) => qq.id === x.q)!;
    const o = q.options.find((oo) => oo.id === x.o)!;
    return { questionId: x.q, delta: { control: o.scores.control ?? 0, visibility: o.scores.visibility ?? 0, timeHorizon: o.scores.timeHorizon ?? 0, powerSource: o.scores.powerSource ?? 0 } };
  });
  const scores = calculateAxisScores(scored);
  return { id: `r${i}`, archetype_id: matchArchetype(scores).archetype.id, pq_score: computePQ(scores, scored), scores, answers, created_at: new Date(Date.now() - i * 60000).toISOString() };
}

const consistent = Array.from({ length: 800 }, (_, i) => respondent(0.8, i));
const random = Array.from({ length: 800 }, (_, i) => respondent(0.0, i));

const rc = analysePsychometrics(consistent);
const rr = analysePsychometrics(random);

console.log("consistent alpha:", rc.reliability.map((r) => `${r.axis}=${r.alpha}`).join(" "));
console.log("random     alpha:", rr.reliability.map((r) => `${r.axis}=${r.alpha}`).join(" "));
const goodItems = rc.items.filter((i) => i.verdict === "good").length;
const goodRandom = rr.items.filter((i) => i.verdict === "good").length;
console.log(`items judged good: consistent=${goodItems}/${rc.items.length} random=${goodRandom}/${rr.items.length}`);
console.log("consistent pair agreement %:", rc.pairs.map((p) => `${p.id}=${p.agreementRate}`).join(" "));
console.log("notes (consistent):", rc.notes.length, "| notes (random):", rr.notes.length);

ok(rc.n === 800 && rr.n === 800, "counts rows");
ok(rc.reliability.every((r) => r.alpha !== null && r.alpha >= 0.6), "consistent population: alpha ≥ 0.6 on every axis", rc.reliability.map((r) => r.alpha).join(","));
ok(rr.reliability.every((r) => r.alpha === null || r.alpha < 0.4), "random population: alpha < 0.4 on every axis", rr.reliability.map((r) => r.alpha).join(","));
ok(goodItems >= 20, "consistent population: ≥20 of 27 items discriminate well", String(goodItems));
ok(goodRandom <= 8, "random population: few items look good", String(goodRandom));
ok(rc.items.every((i) => i.positionShares !== null), "position shares computed when pos recorded");
ok(rc.pairs.every((p) => (p.agreementRate ?? 0) >= 50), "consistent population: every pair agrees ≥50%", rc.pairs.map((p) => p.agreementRate).join(","));
ok(rc.notes.some((n) => /norm-referenced/.test(n)), "norms note appears at n ≥ 300");
// The synthetic population is uniform across the eight archetypes, and five of
// eight centroids sit above 50 on Control and Time-Horizon, so medians there
// legitimately land in the 60s. Check plausibility and monotonic percentiles.
console.log("norm medians:", AXES.map((ax) => `${ax}=${rc.norms[ax].p50}`).join(" "));
ok(AXES.every((ax) => rc.norms[ax].p50 >= 15 && rc.norms[ax].p50 <= 85), "norm medians are plausible");
ok(AXES.every((ax) => rc.norms[ax].p5 <= rc.norms[ax].p50 && rc.norms[ax].p50 <= rc.norms[ax].p95 && rc.norms[ax].p5 < rc.norms[ax].p95), "norm percentiles are monotonic");
ok(Object.values(rc.archetypes).reduce((s, a) => s + a.count, 0) === 800, "archetype counts sum to n");

console.log(failures === 0 ? "\nPSYCHOMETRICS CHECK PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
