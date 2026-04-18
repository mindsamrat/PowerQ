import { archetypes, getCentroid, type Archetype } from "@/data/archetypes";

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

export interface MatchResult {
  archetype: Archetype;
  scores: AxisScores;
  distance: number;
  runnerUp: Archetype;
  runnerUpDistance: number;
  needsTiebreaker: boolean;
}

export function calculateAxisScores(answers: AnswerDelta[]): AxisScores {
  const raw = { control: 50, visibility: 50, timeHorizon: 50, powerSource: 50 };

  for (const a of answers) {
    raw.control += a.control;
    raw.visibility += a.visibility;
    raw.timeHorizon += a.timeHorizon;
    raw.powerSource += a.powerSource;
  }

  return {
    control: Math.max(0, Math.min(100, raw.control)),
    visibility: Math.max(0, Math.min(100, raw.visibility)),
    timeHorizon: Math.max(0, Math.min(100, raw.timeHorizon)),
    powerSource: Math.max(0, Math.min(100, raw.powerSource)),
  };
}

export function matchArchetype(scores: AxisScores): MatchResult {
  const distances = archetypes.map((a) => {
    const c = getCentroid(a);
    const d = Math.sqrt(
      (scores.control - c.control) ** 2 +
      (scores.visibility - c.visibility) ** 2 +
      (scores.timeHorizon - c.timeHorizon) ** 2 +
      (scores.powerSource - c.powerSource) ** 2
    );
    return { archetype: a, distance: d };
  });

  distances.sort((a, b) => a.distance - b.distance);

  const best = distances[0];
  const second = distances[1];

  return {
    archetype: best.archetype,
    scores,
    distance: best.distance,
    runnerUp: second.archetype,
    runnerUpDistance: second.distance,
    needsTiebreaker: second.distance - best.distance < 8,
  };
}

export function computePQ(scores: AxisScores): number {
  return Math.round(
    scores.control * 0.3 +
    scores.visibility * 0.2 +
    scores.timeHorizon * 0.25 +
    scores.powerSource * 0.25
  );
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
  { label: "Systems builder", expect: "architect", scores: { control: 65, visibility: 45, timeHorizon: 90, powerSource: 50 } },
  { label: "Insight-first seer", expect: "oracle", scores: { control: 45, visibility: 55, timeHorizon: 75, powerSource: 15 } },
  { label: "Kinetic enforcer", expect: "blade", scores: { control: 85, visibility: 85, timeHorizon: 15, powerSource: 85 } },
  { label: "Composure politician", expect: "diplomat", scores: { control: 45, visibility: 65, timeHorizon: 75, powerSource: 30 } },
  { label: "Fast opportunist", expect: "hunter", scores: { control: 55, visibility: 35, timeHorizon: 15, powerSource: 55 } },
  { label: "Magnetic presence", expect: "flame", scores: { control: 35, visibility: 90, timeHorizon: 45, powerSource: 10 } },
];

/** Returns which fixtures fail to match their expected archetype. Empty = all pass. */
export function validateFixtures(): { profile: SyntheticProfile; actual: string }[] {
  return syntheticProfiles
    .map((p) => ({ profile: p, actual: matchArchetype(p.scores).archetype.id }))
    .filter(({ profile, actual }) => actual !== profile.expect);
}
