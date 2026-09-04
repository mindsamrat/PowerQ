import { archetypes, getCentroid, type Archetype, type AxisId } from "@/data/archetypes";
import { questions } from "@/data/questions";
import type { AxisScores, MatchResult } from "@/lib/scoring";
import type { StoredAnswer } from "@/lib/signature-answers";

// ---------- Archetype blend ----------
//
// Convert per-archetype fit (direction match, 0–100 — the same number the
// classifier uses) into a softmax percentage so users see they aren't a
// "pure" type. The typical pattern is 60/25/10/5 across the top archetypes.
// Using fit rather than raw distance keeps the blend consistent with the
// verdict: the archetype with the best fit is always the largest slice.

const BLEND_TEMP = 20; // lower = more concentrated on top archetype

export interface BlendEntry {
  id: string;
  name: string;
  percent: number;
  /** Direction-match strength for this archetype, 0–100. */
  fit: number;
}

export function archetypeFits(scores: AxisScores): { archetype: Archetype; fit: number }[] {
  const axes: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
  const v = axes.map((ax) => scores[ax] - 50);
  const vNorm = Math.hypot(...v);
  return archetypes.map((a) => {
    const c = getCentroid(a);
    const dir = axes.map((ax) => c[ax] - 50);
    const dNorm = Math.hypot(...dir) || 1;
    const cos = vNorm < 1e-6 ? 0 : v.reduce((s, x, i) => s + x * dir[i], 0) / (vNorm * dNorm);
    return { archetype: a, fit: Math.round(100 * cos) };
  });
}

export function archetypeBlend(scores: AxisScores): BlendEntry[] {
  const fits = archetypeFits(scores);
  const expWeights = fits.map((x) => Math.exp((x.fit - 100) / BLEND_TEMP));
  const total = expWeights.reduce((s, x) => s + x, 0) || 1;

  return fits
    .map((x, i) => ({
      id: x.archetype.id,
      name: x.archetype.name,
      fit: x.fit,
      percent: Math.round((expWeights[i] / total) * 100),
    }))
    .sort((a, b) => b.percent - a.percent || b.fit - a.fit);
}

// ---------- Match confidence ----------

export type ConfidenceLevel = "high" | "moderate" | "borderline";

export interface ConfidenceReading {
  level: ConfidenceLevel;
  label: string;
  description: string;
  /** Fit gap to the runner-up, in match-strength points. Larger = more confident. */
  gap: number;
}

/**
 * Confidence combines two things:
 *   • gap  — how far ahead the winning archetype is over the runner-up
 *            (match-strength points).
 *   • pq   — how sharply defined the signature is (extremity + answer
 *            consistency). A near-neutral or self-contradicting respondent can
 *            still have a big gap by accident; requiring a minimum PQ stops
 *            random clicking from reading as a "strong match".
 * Thresholds calibrated by simulation: random answering lands ~80% borderline,
 * 70%-consistent respondents land mostly "clear" or "strong".
 */
export const CONFIDENCE_HIGH_GAP = 14;
export const CONFIDENCE_HIGH_PQ = 48;
export const CONFIDENCE_MODERATE_GAP = 7;
export const CONFIDENCE_MODERATE_PQ = 40;

export function readConfidence(match: MatchResult, pq: number): ConfidenceReading {
  const gap = match.gap;
  if (gap >= CONFIDENCE_HIGH_GAP && pq >= CONFIDENCE_HIGH_PQ) {
    return {
      level: "high",
      label: "Strong match",
      description: `Your signature reads as ${match.archetype.name} clearly. The next-closest archetype isn't close.`,
      gap,
    };
  }
  if (gap >= CONFIDENCE_MODERATE_GAP && pq >= CONFIDENCE_MODERATE_PQ) {
    return {
      level: "moderate",
      label: "Clear match",
      description: `${match.archetype.name} is your dominant pattern, with a secondary lean toward ${match.runnerUp.name}.`,
      gap,
    };
  }
  return {
    level: "borderline",
    label: "Borderline",
    description: `You sit between ${match.archetype.name} and ${match.runnerUp.name}. Re-take in 3 months — most people drift toward one.`,
    gap,
  };
}

// ---------- Per-axis attribution ----------
//
// For each axis, surface the two answers whose deltas pushed the user's
// score on that axis the most (in absolute value). Lets the results page
// say: "Your Time-Horizon score is 75 mostly because of your answer to Q9
// and Q14."

export interface AxisAttributionEntry {
  questionId: string;
  prompt: string;
  optionText: string;
  delta: number;
  framework?: { name: string; citation: string; probes: string };
}

export type AxisAttribution = Record<AxisId, AxisAttributionEntry[]>;

export function perAxisAttribution(answers: StoredAnswer[]): AxisAttribution {
  const axes: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
  const result = {} as AxisAttribution;

  for (const axis of axes) {
    const enriched = answers
      .map((a) => {
        const q = questions.find((qq) => qq.id === a.q);
        if (!q || q.kind === "free-text" || q.kind === "email") return null;
        const option = q.options.find((o) => o.id === a.o);
        if (!option) return null;
        const delta = a.d[axis] ?? 0;
        if (Math.abs(delta) < 5) return null;
        return {
          questionId: a.q,
          prompt: q.prompt,
          optionText: option.text,
          delta,
          framework: q.framework,
          magnitude: Math.abs(delta),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    enriched.sort((a, b) => b.magnitude - a.magnitude);
    result[axis] = enriched.slice(0, 2).map(({ magnitude: _, ...rest }) => {
      void _;
      return rest;
    });
  }

  return result;
}

// ---------- Score-band-derived strengths/weaknesses ----------
//
// Generated from the user's actual axis positions, not template per-archetype.
// Each band combination produces specific copy.

export interface DerivedReading {
  axis: AxisId;
  label: string;
  band: "high" | "mid" | "low";
  strength: string;
  warning: string;
  practice: string;
}

const READINGS: Record<AxisId, Record<"high" | "mid" | "low", { strength: string; warning: string; practice: string }>> = {
  control: {
    high: {
      strength: "You take charge without asking. Decisions land where you stand.",
      warning: "You can mistake compliance for agreement. Silence around you isn't consent — it's calculation.",
      practice: "Once a week, ask the most junior person in the room what you missed. Listen without responding for a full minute.",
    },
    mid: {
      strength: "You take command when needed and let others lead when it serves the outcome. Flexible authority.",
      warning: "Mid-control without anchoring values reads as opportunistic. People aren't sure what you stand for.",
      practice: "Write down three things you will not compromise on. Tell the people who report to you. Hold the line.",
    },
    low: {
      strength: "You move people through influence, not orders. Less resistance, more durable buy-in.",
      warning: "Low-control under pressure becomes deferral. The room waits for someone to decide while you defer up.",
      practice: "Pick one decision a week you would normally route to a manager. Make it yourself. Tell them after.",
    },
  },
  visibility: {
    high: {
      strength: "You want your work seen and you make it easy to see. Recognition multiplies your reach.",
      warning: "High visibility makes you a target. Critics know exactly where to aim. Build armor before you build profile.",
      practice: "For every public win, document one private mistake from the same season. The contrast keeps you honest.",
    },
    mid: {
      strength: "You're seen when it matters and quiet when it doesn't. Your audience is the one whose opinion compounds.",
      warning: "Mid-visibility can read as indecision — neither stage nor backstage. Some rooms want you to pick.",
      practice: "Choose one signature platform (writing, speaking, building publicly) and commit for 12 months. No half-bets.",
    },
    low: {
      strength: "You shape outcomes without claiming credit. Your leverage is invisible to people who would target you.",
      warning: "Low visibility compounds into low recall. People forget the architect of wins they enjoyed.",
      practice: "Once a quarter, claim one win publicly. Specific, dated, attributable. You don't have to do it twice — but do it.",
    },
  },
  timeHorizon: {
    high: {
      strength: "You play decade-long games. Setbacks don't move you because you're not measuring this week.",
      warning: "Strategic patience without execution is the most expensive form of cowardice. You can wait forever.",
      practice: "Pick one bet you've been thinking about for over six months. Ship the v1 this month. Imperfect is the point.",
    },
    mid: {
      strength: "You hold tactical and strategic moves in the same hand. Patience is a tool, not a default.",
      warning: "Mid-horizon without an anchor drifts. The years stack up and the pattern doesn't.",
      practice: "Write a one-paragraph 10-year vision. Read it weekly. Reject moves that don't move you toward it.",
    },
    low: {
      strength: "You move now. You ship before others finish the meeting. Speed compounds.",
      warning: "Speed without restraint burns the relationships and reputation that compound. You exit before the value lands.",
      practice: "Identify one position you would normally exit. Stay in it 12 more months. Compound something.",
    },
  },
  powerSource: {
    high: {
      strength: "Your leverage is consequence. People calculate you before they move. You don't need to repeat yourself.",
      warning: "Force-based power costs you the truth. People stop telling you what you don't want to hear.",
      practice: "Find one person who is not afraid of you. Pay them to tell you what your team is hiding from you.",
    },
    mid: {
      strength: "You mix warmth and weight. People feel both your charm and the cost of crossing you.",
      warning: "Mid power-source can feel inconsistent — sometimes warm, sometimes hard. People don't always know which.",
      practice: "Be deliberate about which mode you use when. Pick a week to lead with warmth, a week to lead with weight. Note the difference.",
    },
    low: {
      strength: "You pull rather than push. People move toward you because of who you are, not what you'd do.",
      warning: "Pure magnetism without consequence creates beautiful systems with no spine. People love you and ignore your asks.",
      practice: "Once a quarter, say the hard 'no' that costs you a relationship. Magnetism survives one true no. It dies of yes.",
    },
  },
};

export const axisLongLabels: Record<AxisId, string> = {
  control: "Control",
  visibility: "Visibility",
  timeHorizon: "Time-Horizon",
  powerSource: "Power-Source",
};

export function deriveReadings(scores: AxisScores): DerivedReading[] {
  const axes: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
  return axes.map((axis) => {
    const value = scores[axis];
    const band: "high" | "mid" | "low" = value <= 33 ? "low" : value >= 67 ? "high" : "mid";
    return {
      axis,
      label: axisLongLabels[axis],
      band,
      ...READINGS[axis][band],
    };
  });
}

// ---------- Level-up moves ----------
//
// For each axis × band combination, three concrete moves: what to keep doing,
// what to develop next (the growth direction), what to watch out for. This is
// what gets surfaced on the "How to Level Up" page of the paid PDF.

interface LevelUpMoves { keep: string; develop: string; watch: string }

const LEVEL_UP: Record<AxisId, Record<"low" | "mid" | "high", LevelUpMoves>> = {
  control: {
    low: {
      keep: "Your influence-first approach generates less resistance and more durable buy-in than direct command does. Don't trade that for performative authority.",
      develop: "Practice making one decision a week that you'd normally route up. Tell the other person after, not before. Notice that the world doesn't end.",
      watch: "Low control under acute pressure can curdle into deferral. When the room genuinely needs a call and no one else is making it, that's the moment to make yours.",
    },
    mid: {
      keep: "You can lead when needed and step back when serving. That flexibility is rare and undervalued.",
      develop: "Pick three things you will never compromise on. Tell the people who report to you. Hold the line in two situations this quarter where it costs you.",
      watch: "Mid-control without anchoring values can read as opportunistic. Define what you stand for in plain language; otherwise the room fills in their own answer.",
    },
    high: {
      keep: "Your decisiveness is the antidote to other people's paralysis. Rooms run faster when you're in them.",
      develop: "Add one advisor whose only job is to disagree with you in writing, weekly. Pay them enough that they stay candid. Make them part of the structure, not an option.",
      watch: "Authority filters reality. By year three of any role your team is editing what reaches you. Audit your information channels every quarter — name who shapes what you see.",
    },
  },
  visibility: {
    low: {
      keep: "Working in the dark is a structural advantage. Critics can't aim at what they can't see.",
      develop: "Once a quarter, claim one win publicly. Specific, dated, attributable. You don't need to do it twice — once a year keeps your network real.",
      watch: "Total invisibility curdles into irrelevance. People forget the architect of wins they enjoyed. Surface deliberately, on your terms.",
    },
    mid: {
      keep: "You're seen when it matters and quiet when it doesn't. The audience whose opinion you optimise for is the one whose opinion compounds.",
      develop: "Pick one signature platform — writing, speaking, building publicly — and commit for 12 months. No half-bets. The compounding starts in month 9.",
      watch: "Mid-visibility without commitment reads as indecision. Some rooms need you to pick a stage.",
    },
    high: {
      keep: "Recognition is a multiplier. You use it consciously, which is what separates real visibility from vanity.",
      develop: "For every public win, document one private mistake from the same season. The contrast keeps you honest and gives critics less to invent.",
      watch: "Visibility makes you a target. Build armour before profile. Have one room where you're allowed to be wrong without it being content.",
    },
  },
  timeHorizon: {
    low: {
      keep: "Speed is your weapon. You've shipped more by Tuesday than slower types ship by Friday.",
      develop: "Pick one position you'd normally exit. Stay in it 12 more months. Compound something — capital, reputation, or a relationship.",
      watch: "Speed without selection burns the relationships you compound on. Identify one anchor you will not burn for any deal. Document why.",
    },
    mid: {
      keep: "You hold tactical and strategic in the same hand. Patience is a tool, not a default — that's the rare combination.",
      develop: "Write a one-paragraph 10-year vision. Read it weekly. Reject moves that don't move you toward it.",
      watch: "Mid-horizon without an anchor drifts. Years stack and the pattern doesn't. Name what you want to be true at 50.",
    },
    high: {
      keep: "You play decade-long games. Setbacks read as data points, not events. Compounding is your structural edge.",
      develop: "Ship one thing this month that would normally feel premature to you. Imperfect-and-shipped is the missing leg of strategy.",
      watch: "Strategic patience without execution is the most expensive form of cowardice. A blueprint you've held for over six months is asking to be tested in the world.",
    },
  },
  powerSource: {
    low: {
      keep: "Pull beats push for durable influence. People who move toward you stay; people you push leave the moment the pressure does.",
      develop: "Practice one hard 'no' a quarter that costs you a room. Magnetism that has no spine becomes service. The first true 'no' restores its value.",
      watch: "Pure pull without consequence creates beautiful systems with no spine. People love you and ignore your asks. Show that 'no' is in your vocabulary.",
    },
    mid: {
      keep: "You mix warmth and weight. People feel both your charm and the cost of crossing you.",
      develop: "Be deliberate about which mode you use when. Dedicate one week each month to leading with warmth, one with weight. Note the difference in outcomes.",
      watch: "Inconsistency on power-source can feel arbitrary to your team. They prefer 'always firm' or 'always warm' over 'sometimes both' if the rule isn't visible.",
    },
    high: {
      keep: "Your leverage is consequence. People calculate you before they move. You don't repeat yourself; the room remembers.",
      develop: "Find one person who is not afraid of you and pay them to tell you what your team is hiding. The cost of that audit is small. The cost of not doing it scales.",
      watch: "Force-based power costs you the truth. People stop telling you what you don't want to hear. By year three you are deciding on a curated reality.",
    },
  },
};

export interface LevelUpEntry { axis: AxisId; label: string; band: "low" | "mid" | "high"; score: number; moves: LevelUpMoves }

export function levelUpMoves(scores: AxisScores): LevelUpEntry[] {
  const axes: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];
  return axes.map((axis) => {
    const value = scores[axis];
    const band: "high" | "mid" | "low" = value <= 33 ? "low" : value >= 67 ? "high" : "mid";
    return {
      axis,
      label: axisLongLabels[axis],
      band,
      score: value,
      moves: LEVEL_UP[axis][band],
    };
  });
}

// ---------- Helpers ----------

export function topArchetypes(blend: BlendEntry[], n = 3): BlendEntry[] {
  return blend.slice(0, n).filter((x) => x.percent >= 4);
}

export function getArchetype(id: string): Archetype | undefined {
  return archetypes.find((a) => a.id === id);
}
