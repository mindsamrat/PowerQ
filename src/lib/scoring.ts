import { archetypes, getCentroid, type Archetype } from "@/data/archetypes";
import { questions } from "@/data/questions";

export interface AxisScores {
  control: number;
  visibility: number;
  timeHorizon: number;
  powerSource: number;
}

export interface AnswerDelta {
  control: number;
  visibility: number;
  timeHorizon: number;
  powerSource: number;
}

/** One scored answer: which question it came from plus the option's raw deltas. */
export interface ScoredAnswer {
  questionId: string;
  delta: AnswerDelta;
}

export interface MatchResult {
  archetype: Archetype;
  scores: AxisScores;
  /** Match strength 0–100: how closely your direction from neutral matches this archetype's. */
  fit: number;
  /** Euclidean distance to the archetype centroid (reported for reference). */
  distance: number;
  runnerUp: Archetype;
  runnerUpFit: number;
  runnerUpDistance: number;
  /** fit − runnerUpFit, in match-strength points. */
  gap: number;
  needsTiebreaker: boolean;
}

/** Minimum fit gap (points) below which the match is considered borderline. */
export const BORDERLINE_GAP = 8;

const AXES = ["control", "visibility", "timeHorizon", "powerSource"] as const;
type Axis = (typeof AXES)[number];

/**
 * Scores are mapped into [50 - SCALE, 50 + SCALE]. 45 means a respondent who
 * picks the most extreme option on every question lands at 5 or 95, never at
 * the hard 0/100 wall — preserving the sense that growth is still possible.
 */
const SCALE = 45;

interface AxisBounds { min: number; max: number }

const boundsCache = new Map<string, Record<Axis, AxisBounds>>();

/** Per-question min/max option delta on each axis (memoised). */
function questionBounds(questionId: string): Record<Axis, AxisBounds> | null {
  const cached = boundsCache.get(questionId);
  if (cached) return cached;
  const q = questions.find((qq) => qq.id === questionId);
  if (!q || q.kind === "free-text" || q.kind === "email") return null;
  const out = {} as Record<Axis, AxisBounds>;
  for (const ax of AXES) {
    const vals = q.options.map((o) => o.scores[ax] ?? 0);
    out[ax] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  boundsCache.set(questionId, out);
  return out;
}

/**
 * Range-normalised scoring.
 *
 * Each question contributes its option delta *relative to the spread of that
 * question's own options*. The sum is then mapped so that "picked the lowest
 * option on every answered question" = 5 and "picked the highest on every
 * answered question" = 95. Picking middle-of-the-road options lands you at 50.
 *
 * Why this and not a raw cumulative sum: with a raw sum, an axis where most
 * options happen to be positive (e.g. Control) drifts to the ceiling for
 * everyone, regardless of what they chose. Range-normalisation removes that
 * drift and makes the four axes genuinely comparable across respondents —
 * the same score means the same thing for every person who takes the test.
 *
 * Only the questions actually answered count toward the range, so a
 * respondent who skipped the tiebreaker block (adaptive path) is scored on
 * exactly the same footing as one who saw them.
 */
export function calculateAxisScores(answers: ScoredAnswer[]): AxisScores {
  const sum: Record<Axis, number> = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };
  const lo: Record<Axis, number> = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };
  const hi: Record<Axis, number> = { control: 0, visibility: 0, timeHorizon: 0, powerSource: 0 };

  for (const a of answers) {
    const b = questionBounds(a.questionId);
    if (!b) continue;
    for (const ax of AXES) {
      sum[ax] += a.delta[ax];
      lo[ax] += b[ax].min;
      hi[ax] += b[ax].max;
    }
  }

  const out = {} as AxisScores;
  for (const ax of AXES) {
    const range = hi[ax] - lo[ax];
    if (range <= 0) { out[ax] = 50; continue; }
    // position in [-1, 1] relative to the midpoint of the reachable range
    const pos = (2 * sum[ax] - lo[ax] - hi[ax]) / range;
    out[ax] = Math.round(Math.max(0, Math.min(100, 50 + SCALE * pos)));
  }
  return out;
}

/**
 * Archetype matching = direction matching.
 *
 * Think of the four axis scores as an arrow pointing away from neutral
 * (50/50/50/50). Each archetype is also an arrow. Your archetype is the one
 * whose arrow points most nearly the same way as yours (cosine similarity,
 * reported as "fit" on a 0–100 scale). How *long* your arrow is — how far
 * from neutral you sit — is not used for classification; that is what the
 * PQ number measures.
 *
 * Why direction and not plain distance: with nearest-centroid distance, a
 * moderately-Sovereign person (say 70/65/62/60) is closer to the mild
 * archetypes that live near the middle of the space than to the Sovereign
 * centroid, and gets misfiled. Direction matching classifies by *pattern*,
 * which is what an archetype is.
 */
export function matchArchetype(scores: AxisScores): MatchResult {
  const v = AXES.map((ax) => scores[ax] - 50);
  const vNorm = Math.hypot(...v);

  const ranked = archetypes.map((a) => {
    const c = getCentroid(a);
    const dir = AXES.map((ax) => c[ax] - 50);
    const dNorm = Math.hypot(...dir) || 1;
    const cos = vNorm < 1e-6 ? 0 : v.reduce((s, x, i) => s + x * dir[i], 0) / (vNorm * dNorm);
    const distance = Math.hypot(...AXES.map((ax) => scores[ax] - c[ax]));
    return { archetype: a, fit: Math.round(100 * cos), distance };
  });

  // Primary sort by fit; a perfectly neutral respondent (all fits 0) falls
  // back to nearest centroid so the result is still deterministic.
  ranked.sort((a, b) => (b.fit - a.fit) || (a.distance - b.distance));

  const best = ranked[0];
  const second = ranked[1];
  const gap = best.fit - second.fit;

  return {
    archetype: best.archetype,
    scores,
    fit: best.fit,
    distance: best.distance,
    runnerUp: second.archetype,
    runnerUpFit: second.fit,
    runnerUpDistance: second.distance,
    gap,
    needsTiebreaker: gap < BORDERLINE_GAP,
  };
}

/**
 * Signature Definition (the "PQ" number), 0–100.
 *
 * This is NOT "how much power you have" — every archetype is a valid form of
 * power. It measures how sharply defined your power signature is:
 *
 *   • Extremity (50%): how far your four axis scores sit from neutral (50).
 *     A person at 50/50/50/50 has no signature; a person at 90/10/85/85 has
 *     a very pronounced one.
 *   • Consistency (50%): the fraction of your answers that pointed in the
 *     same direction as your final archetype. Random or contradictory
 *     answering scores low here even if the axis scores drift somewhere.
 *
 * A Flame and a Sovereign can both score 90. A respondent who clicked at
 * random lands in the 20s–30s. This makes the number comparable across
 * people and honest about what it measures.
 */
export interface PQBreakdown {
  /** 0–100: mean distance of the four axes from neutral, as % of the maximum. */
  extremity: number;
  /** 0–100: % of answered questions whose choice pointed toward the final archetype. */
  consistency: number;
  /** Number of scored answers the consistency figure is based on. */
  answered: number;
  pq: number;
}

export function computePQ(scores: AxisScores, answers: ScoredAnswer[] = []): number {
  return pqBreakdown(scores, answers).pq;
}

export function pqBreakdown(scores: AxisScores, answers: ScoredAnswer[] = []): PQBreakdown {
  const extremity = AXES.reduce((s, ax) => s + Math.abs(scores[ax] - 50), 0) / (AXES.length * SCALE);

  let consistency = 0.5; // neutral fallback when no answers are supplied
  let counted = 0;
  if (answers.length > 0) {
    const centroid = getCentroid(matchArchetype(scores).archetype);
    const dir = AXES.map((ax) => centroid[ax] - 50);
    const dirNorm = Math.hypot(...dir) || 1;
    let agree = 0;
    for (const a of answers) {
      const b = questionBounds(a.questionId);
      if (!b) continue;
      // centre the option delta within its question's spread
      const centred = AXES.map((ax) => a.delta[ax] - (b[ax].min + b[ax].max) / 2);
      const n = Math.hypot(...centred);
      if (n === 0) continue;
      const cos = centred.reduce((s, v, i) => s + v * dir[i], 0) / (n * dirNorm);
      if (cos > 0.15) agree += 1;
      counted += 1;
    }
    consistency = counted > 0 ? agree / counted : 0.5;
  }

  const ext = Math.min(1, extremity);
  return {
    extremity: Math.round(100 * ext),
    consistency: Math.round(100 * consistency),
    answered: counted,
    pq: Math.round(100 * (0.5 * ext + 0.5 * consistency)),
  };
}

// ---------- Synthetic profile fixtures (per archetype) ----------

export interface SyntheticProfile {
  label: string;
  expect: string;
  scores: AxisScores;
}

export const syntheticProfiles: SyntheticProfile[] = [
  { label: "Open commander", expect: "sovereign", scores: { control: 90, visibility: 85, timeHorizon: 75, powerSource: 70 } },
  { label: "Invisible operator", expect: "shadow", scores: { control: 85, visibility: 15, timeHorizon: 85, powerSource: 85 } },
  { label: "Systems builder", expect: "architect", scores: { control: 70, visibility: 50, timeHorizon: 90, powerSource: 45 } },
  { label: "Insight-first seer", expect: "oracle", scores: { control: 25, visibility: 40, timeHorizon: 80, powerSource: 15 } },
  { label: "Kinetic enforcer", expect: "blade", scores: { control: 85, visibility: 85, timeHorizon: 15, powerSource: 85 } },
  { label: "Composure politician", expect: "diplomat", scores: { control: 55, visibility: 80, timeHorizon: 80, powerSource: 20 } },
  { label: "Fast opportunist", expect: "hunter", scores: { control: 55, visibility: 25, timeHorizon: 15, powerSource: 45 } },
  { label: "Magnetic presence", expect: "flame", scores: { control: 30, visibility: 90, timeHorizon: 35, powerSource: 10 } },
  // Moderate versions: same pattern, half the intensity. Direction matching must still classify them.
  { label: "Mild commander", expect: "sovereign", scores: { control: 70, visibility: 67, timeHorizon: 62, powerSource: 60 } },
  { label: "Mild operator", expect: "shadow", scores: { control: 67, visibility: 33, timeHorizon: 67, powerSource: 67 } },
  { label: "Mild seer", expect: "oracle", scores: { control: 38, visibility: 45, timeHorizon: 65, powerSource: 33 } },
  { label: "Mild politician", expect: "diplomat", scores: { control: 52, visibility: 65, timeHorizon: 65, powerSource: 35 } },
  { label: "Mild presence", expect: "flame", scores: { control: 40, visibility: 70, timeHorizon: 43, powerSource: 30 } },
];

/** Returns which fixtures fail to match their expected archetype. Empty = all pass. */
export function validateFixtures(): { profile: SyntheticProfile; actual: string }[] {
  return syntheticProfiles
    .map((p) => ({ profile: p, actual: matchArchetype(p.scores).archetype.id }))
    .filter(({ profile, actual }) => actual !== profile.expect);
}
