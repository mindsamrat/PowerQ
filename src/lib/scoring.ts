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

// ---------- Verification ----------

if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  const profiles: { label: string; answers: AnswerDelta[] }[] = [
    {
      label: "High-command, high-visibility leader (expect Sovereign)",
      answers: [
        { control: 15, visibility: 15, timeHorizon: 5, powerSource: 5 },
        { control: 15, visibility: 10, timeHorizon: 10, powerSource: 10 },
        { control: 10, visibility: 10, timeHorizon: 5, powerSource: 5 },
        { control: 10, visibility: 5, timeHorizon: 10, powerSource: 10 },
        { control: 10, visibility: 10, timeHorizon: 5, powerSource: 5 },
      ],
    },
    {
      label: "Invisible, patient, forceful operator (expect Shadow)",
      answers: [
        { control: 10, visibility: -15, timeHorizon: 15, powerSource: 15 },
        { control: 15, visibility: -10, timeHorizon: 10, powerSource: 10 },
        { control: 10, visibility: -15, timeHorizon: 10, powerSource: 10 },
        { control: 5, visibility: -10, timeHorizon: 15, powerSource: 15 },
        { control: 10, visibility: -10, timeHorizon: 10, powerSource: 10 },
      ],
    },
    {
      label: "Charismatic, visible, magnetic presence (expect Flame)",
      answers: [
        { control: -5, visibility: 15, timeHorizon: 0, powerSource: -15 },
        { control: 0, visibility: 10, timeHorizon: 5, powerSource: -10 },
        { control: -5, visibility: 15, timeHorizon: -5, powerSource: -15 },
        { control: 0, visibility: 10, timeHorizon: 0, powerSource: -10 },
        { control: -10, visibility: 15, timeHorizon: 5, powerSource: -15 },
      ],
    },
  ];

  console.log("\n=== PQ Scoring Engine Verification ===\n");

  for (const p of profiles) {
    const scores = calculateAxisScores(p.answers);
    const match = matchArchetype(scores);
    const pq = computePQ(scores);

    console.log(`Profile: ${p.label}`);
    console.log(`  Axes: C=${scores.control} V=${scores.visibility} T=${scores.timeHorizon} P=${scores.powerSource}`);
    console.log(`  PQ Score: ${pq}/100`);
    console.log(`  Match: ${match.archetype.name} (distance: ${match.distance.toFixed(1)})`);
    console.log(`  Runner-up: ${match.runnerUp.name} (distance: ${match.runnerUpDistance.toFixed(1)})`);
    console.log(`  Tiebreaker needed: ${match.needsTiebreaker}`);
    console.log();
  }
}
