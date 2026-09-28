import { choiceQuestions, type ChoiceQuestion } from "@/data/questions";
import { archetypes, type AxisId } from "@/data/archetypes";
import { matchArchetype, type AxisScores } from "@/lib/scoring";
import { readConfidence, evaluateContradictions, CONTRADICTION_PAIRS } from "@/lib/result-analysis";
import { AXES } from "@/lib/archetype-insights";

/**
 * Item analysis and reliability for the PQ instrument, computed from stored
 * responses. Pure functions: pass rows in, get a report out. This is what
 * turns "a well-built quiz" into "a validated one" once real data exists.
 *
 * Nothing here needs names, emails or IPs, and the admin page never loads them.
 */

export interface ResponseSample {
  id: string;
  archetype_id: string;
  pq_score: number;
  scores: AxisScores;
  answers: { q: string; o: string; pos?: number }[];
  created_at: string;
}

export interface DistributionStats {
  n: number;
  mean: number;
  sd: number;
  percentiles: Record<string, number>;
}

export interface ItemAxisStat {
  axis: AxisId;
  /** Corrected item-total correlation: option's centred delta vs the axis score computed without this item. */
  r: number | null;
  n: number;
  spread: number;
}

export interface ItemReport {
  id: string;
  prompt: string;
  kind: ChoiceQuestion["kind"];
  primaryAxis: AxisId | undefined;
  n: number;
  optionShares: Record<string, number>;
  positionShares: Record<string, number> | null;
  /** Largest position share minus 0.25; > 0.15 suggests position bias. */
  positionBias: number | null;
  axes: ItemAxisStat[];
  primaryR: number | null;
  verdict: "good" | "weak" | "reversed" | "insufficient";
}

export interface AxisReliability {
  axis: AxisId;
  alpha: number | null;
  items: number;
  n: number;
}

export interface PairStat {
  id: string;
  construct: string;
  n: number;
  contradictionRate: number | null;
  agreementRate: number | null;
}

export interface PsychometricReport {
  n: number;
  from: string | null;
  to: string | null;
  archetypes: { id: string; name: string; observedPct: number; seededPct: number; count: number }[];
  axes: Record<AxisId, DistributionStats>;
  pq: DistributionStats;
  confidence: Record<"high" | "moderate" | "borderline", number>;
  items: ItemReport[];
  reliability: AxisReliability[];
  pairs: PairStat[];
  /** Percentile norms per axis (5..95 step 5) — proposed replacement for the fixed 5–95 mapping. */
  norms: Record<AxisId, Record<string, number>>;
  notes: string[];
}

// ---------- small numeric helpers ----------

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
const variance = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
};
const sd = (xs: number[]) => Math.sqrt(variance(xs));

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 20) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

function distribution(xs: number[]): DistributionStats {
  const sorted = [...xs].sort((a, b) => a - b);
  const percentiles: Record<string, number> = {};
  for (const p of [5, 10, 25, 50, 75, 90, 95]) percentiles[`p${p}`] = Math.round(percentile(sorted, p) * 10) / 10;
  return { n: xs.length, mean: Math.round(mean(xs) * 10) / 10, sd: Math.round(sd(xs) * 10) / 10, percentiles };
}

const round2 = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

// ---------- per-question geometry (mirrors lib/scoring.ts) ----------

interface Bounds { min: number; max: number }
const questionById = new Map(choiceQuestions.map((q) => [q.id, q]));

function bounds(q: ChoiceQuestion, axis: AxisId): Bounds {
  const vals = q.options.map((o) => o.scores[axis] ?? 0);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function centred(q: ChoiceQuestion, optionId: string, axis: AxisId): number | null {
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return null;
  const b = bounds(q, axis);
  return (opt.scores[axis] ?? 0) - (b.min + b.max) / 2;
}

const SCALE = 45;

/** Axis score from summed deltas and summed bounds — same mapping as calculateAxisScores. */
function scoreFromSums(sum: number, lo: number, hi: number): number {
  const range = hi - lo;
  if (range <= 0) return 50;
  return Math.max(0, Math.min(100, 50 + SCALE * ((2 * sum - lo - hi) / range)));
}

// ---------- the analysis ----------

export function analysePsychometrics(rows: ResponseSample[]): PsychometricReport {
  const valid = rows.filter((r) => r && Array.isArray(r.answers) && r.scores);
  const n = valid.length;
  const dates = valid.map((r) => r.created_at).filter(Boolean).sort();
  const notes: string[] = [];

  // Archetype distribution
  const counts = new Map<string, number>();
  for (const r of valid) counts.set(r.archetype_id, (counts.get(r.archetype_id) ?? 0) + 1);
  const archetypeRows = archetypes.map((a) => ({
    id: a.id,
    name: a.name,
    count: counts.get(a.id) ?? 0,
    observedPct: n ? Math.round((1000 * (counts.get(a.id) ?? 0)) / n) / 10 : 0,
    seededPct: a.rarity,
  }));

  // Axis + PQ + confidence distributions
  const axisValues: Record<AxisId, number[]> = { control: [], visibility: [], timeHorizon: [], powerSource: [] };
  const pqValues: number[] = [];
  const conf = { high: 0, moderate: 0, borderline: 0 };
  for (const r of valid) {
    for (const ax of AXES) axisValues[ax].push(Number(r.scores[ax]) || 50);
    const pq = Number(r.pq_score) || 0;
    pqValues.push(pq);
    conf[readConfidence(matchArchetype(r.scores), pq).level] += 1;
  }
  const axesStats = {} as Record<AxisId, DistributionStats>;
  const norms = {} as Record<AxisId, Record<string, number>>;
  for (const ax of AXES) {
    axesStats[ax] = distribution(axisValues[ax]);
    const sorted = [...axisValues[ax]].sort((a, b) => a - b);
    norms[ax] = {};
    for (let p = 5; p <= 95; p += 5) norms[ax][`p${p}`] = Math.round(percentile(sorted, p));
  }

  // Per-respondent sums for fast "rest score" computation
  interface RowSums { sum: Record<AxisId, number>; lo: Record<AxisId, number>; hi: Record<AxisId, number>; answered: Map<string, string> }
  const rowSums: RowSums[] = valid.map((r) => {
    const sum = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };
    const lo = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };
    const hi = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };
    const answered = new Map<string, string>();
    for (const a of r.answers) {
      const q = questionById.get(a.q);
      if (!q || answered.has(a.q)) continue;
      const opt = q.options.find((o) => o.id === a.o);
      if (!opt) continue;
      answered.set(a.q, a.o);
      for (const ax of AXES) {
        const b = bounds(q, ax);
        sum[ax] += opt.scores[ax] ?? 0;
        lo[ax] += b.min;
        hi[ax] += b.max;
      }
    }
    return { sum, lo, hi, answered };
  });

  // Item analysis
  const items: ItemReport[] = choiceQuestions.map((q) => {
    const optionCounts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const positionCounts: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0 };
    let nItem = 0;
    let nPos = 0;
    const xs: Record<AxisId, number[]> = { control: [], visibility: [], timeHorizon: [], powerSource: [] };
    const ys: Record<AxisId, number[]> = { control: [], visibility: [], timeHorizon: [], powerSource: [] };

    valid.forEach((r, i) => {
      const o = rowSums[i].answered.get(q.id);
      if (!o) return;
      nItem += 1;
      optionCounts[o] = (optionCounts[o] ?? 0) + 1;
      const raw = r.answers.find((a) => a.q === q.id);
      if (raw && Number.isInteger(raw.pos)) { positionCounts[String(raw.pos)] += 1; nPos += 1; }
      const opt = q.options.find((x) => x.id === o)!;
      for (const ax of AXES) {
        const b = bounds(q, ax);
        if (b.max - b.min === 0) continue;
        const c = centred(q, o, ax);
        if (c === null) continue;
        const rs = rowSums[i];
        const rest = scoreFromSums(rs.sum[ax] - (opt.scores[ax] ?? 0), rs.lo[ax] - b.min, rs.hi[ax] - b.max);
        xs[ax].push(c);
        ys[ax].push(rest);
      }
    });

    const optionShares: Record<string, number> = {};
    for (const k of Object.keys(optionCounts)) optionShares[k] = nItem ? Math.round((100 * optionCounts[k]) / nItem) : 0;
    let positionShares: Record<string, number> | null = null;
    let positionBias: number | null = null;
    if (nPos >= 30) {
      positionShares = {};
      for (const k of Object.keys(positionCounts)) positionShares[k] = Math.round((100 * positionCounts[k]) / nPos);
      positionBias = Math.round(100 * (Math.max(...Object.values(positionCounts)) / nPos - 0.25)) / 100;
    }

    const axesStat: ItemAxisStat[] = AXES
      .filter((ax) => { const b = bounds(q, ax); return b.max - b.min > 0; })
      .map((ax) => ({ axis: ax, r: round2(pearson(xs[ax], ys[ax])), n: xs[ax].length, spread: bounds(q, ax).max - bounds(q, ax).min }));

    const primary = axesStat.find((s) => s.axis === q.primaryAxis) ?? null;
    const primaryR = primary?.r ?? null;
    const verdict: ItemReport["verdict"] =
      primaryR === null ? "insufficient" : primaryR < 0 ? "reversed" : primaryR < 0.15 ? "weak" : "good";

    return { id: q.id, prompt: q.prompt, kind: q.kind, primaryAxis: q.primaryAxis, n: nItem, optionShares, positionShares, positionBias, axes: axesStat, primaryR, verdict };
  });

  // Reliability (Cronbach's alpha) per axis over the always-served items
  const reliability: AxisReliability[] = AXES.map((ax) => {
    const itemQs = choiceQuestions.filter((q) => q.kind !== "tiebreaker" && bounds(q, ax).max - bounds(q, ax).min > 0);
    const matrix: number[][] = [];
    valid.forEach((r, i) => {
      const row: number[] = [];
      for (const q of itemQs) {
        const o = rowSums[i].answered.get(q.id);
        if (!o) return;
        const c = centred(q, o, ax);
        if (c === null) return;
        row.push(c);
      }
      matrix.push(row);
    });
    const k = itemQs.length;
    if (matrix.length < 30 || k < 2) return { axis: ax, alpha: null, items: k, n: matrix.length };
    const itemVars = itemQs.map((_, j) => variance(matrix.map((row) => row[j])));
    const totalVar = variance(matrix.map((row) => row.reduce((s, v) => s + v, 0)));
    const alpha = totalVar === 0 ? null : (k / (k - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totalVar);
    return { axis: ax, alpha: round2(alpha), items: k, n: matrix.length };
  });

  // Paired-question consistency
  const pairAgg = new Map<string, { n: number; contra: number; agree: number }>();
  for (const p of CONTRADICTION_PAIRS) pairAgg.set(p.id, { n: 0, contra: 0, agree: 0 });
  for (const r of valid) {
    const res = evaluateContradictions(r.answers);
    for (const p of res.pairs) {
      const agg = pairAgg.get(p.pairId)!;
      agg.n += 1;
      if (p.agreement === "contradiction") agg.contra += 1;
      if (p.agreement === "consistent") agg.agree += 1;
    }
  }
  const pairs: PairStat[] = CONTRADICTION_PAIRS.map((p) => {
    const a = pairAgg.get(p.id)!;
    return {
      id: p.id,
      construct: p.construct,
      n: a.n,
      contradictionRate: a.n ? Math.round((100 * a.contra) / a.n) : null,
      agreementRate: a.n ? Math.round((100 * a.agree) / a.n) : null,
    };
  });

  // Notes
  if (n < 50) notes.push(`Only ${n} responses. Treat every figure here as provisional; item statistics need at least ~100 and norms ~300.`);
  for (const it of items) {
    if (it.verdict === "reversed") notes.push(`${it.id} is REVERSED on ${it.primaryAxis} (r = ${it.primaryR}): people who choose its "high" options score low on that axis elsewhere. Rewrite or drop.`);
    else if (it.verdict === "weak") notes.push(`${it.id} discriminates weakly on ${it.primaryAxis} (r = ${it.primaryR}). Candidate for rewriting.`);
    if (it.positionBias !== null && it.positionBias >= 0.15) notes.push(`${it.id} shows position bias (one slot picked ${Math.round((it.positionBias + 0.25) * 100)}% of the time). Shuffling is on; check whether one option is simply dominant.`);
  }
  for (const rel of reliability) {
    if (rel.alpha !== null && rel.alpha < 0.6) notes.push(`${rel.axis} reliability is low (alpha = ${rel.alpha}). The ${rel.items} items on this axis do not agree with each other enough; the axis needs sharper items.`);
  }
  if (n >= 200) {
    for (const a of archetypeRows) {
      if (Math.abs(a.observedPct - a.seededPct) >= 10) notes.push(`${a.name}: observed ${a.observedPct}% vs seeded rarity ${a.seededPct}%. Recompute rarity from data.`);
    }
    const borderline = n ? conf.borderline / n : 0;
    if (borderline > 0.4) notes.push(`${Math.round(100 * borderline)}% of respondents read as Borderline. Either the population is genuinely mixed or the confidence thresholds are too strict for real data.`);
  }
  if (n >= 300) notes.push("Enough data for norm-referenced scoring: the percentile table below can replace the fixed 5–95 mapping so a score of 75 means 'above 75% of respondents'.");

  return {
    n,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    archetypes: archetypeRows,
    axes: axesStats,
    pq: distribution(pqValues),
    confidence: conf,
    items,
    reliability,
    pairs,
    norms,
    notes,
  };
}
