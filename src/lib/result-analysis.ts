import { archetypes, getCentroid, axisLabels, type Archetype, type AxisId } from "@/data/archetypes";
import { questions } from "@/data/questions";
import { centredOptionVector, cosine, AXES as AXIS_ORDER } from "@/lib/archetype-insights";
import { rankArchetypes } from "@/lib/scoring";
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
  return rankArchetypes(scores).map((r) => ({ archetype: r.archetype, fit: Math.round(100 * r.cos) }));
}

/** Round percentages so they sum to exactly 100 (largest remainder). */
function roundToHundred(raw: number[]): number[] {
  const floors = raw.map((x) => Math.floor(x));
  let remaining = 100 - floors.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => ({ i, rem: x - Math.floor(x) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

export function archetypeBlend(scores: AxisScores): BlendEntry[] {
  // Same ranking as the verdict, so blend[0] is always the verdict archetype.
  const ranked = rankArchetypes(scores);
  const weights = ranked.map((r) => Math.exp((100 * r.cos - 100) / BLEND_TEMP));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  const percents = roundToHundred(weights.map((w) => (100 * w) / total));
  return ranked.map((r, i) => ({ id: r.archetype.id, name: r.archetype.name, fit: Math.round(100 * r.cos), percent: percents[i] }));
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
/**
 * Direction matching ignores magnitude, so a near-neutral random profile can
 * still show a large fit gap. A minimum distance from neutral (mean |score-50|,
 * in points) stops random clicking from reading as a strong or clear match.
 */
export const CONFIDENCE_HIGH_MIN_SPREAD = 9;
export const CONFIDENCE_MODERATE_MIN_SPREAD = 6;

export function meanSpread(scores: AxisScores): number {
  return (Math.abs(scores.control - 50) + Math.abs(scores.visibility - 50) + Math.abs(scores.timeHorizon - 50) + Math.abs(scores.powerSource - 50)) / 4;
}

export function readConfidence(match: MatchResult, pq: number): ConfidenceReading {
  const gap = match.gap;
  const spread = meanSpread(match.scores);
  if (gap >= CONFIDENCE_HIGH_GAP && pq >= CONFIDENCE_HIGH_PQ && spread >= CONFIDENCE_HIGH_MIN_SPREAD) {
    return {
      level: "high",
      label: "Strong match",
      description: `Your signature reads as ${match.archetype.name} clearly. The next-closest archetype isn't close.`,
      gap,
    };
  }
  if (gap >= CONFIDENCE_MODERATE_GAP && pq >= CONFIDENCE_MODERATE_PQ && spread >= CONFIDENCE_MODERATE_MIN_SPREAD) {
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

/** First answer per question wins — the same rule the scorer uses. */
export function dedupeAnswers<T extends { q: string }>(answers: T[]): T[] {
  const seen = new Set<string>();
  return answers.filter((a) => (a && typeof a.q === "string" && !seen.has(a.q) ? (seen.add(a.q), true) : false));
}

/**
 * For each axis, the two answers that pushed the score furthest in the
 * direction it actually ended up (above or below 50). Contributions are
 * centred within each question, exactly as the scorer counts them; the
 * reported delta is that centred contribution.
 */
export function perAxisAttribution(answers: StoredAnswer[], scores: AxisScores): AxisAttribution {
  const result = {} as AxisAttribution;
  const clean = dedupeAnswers(answers);

  AXIS_ORDER.forEach((axis, axisIndex) => {
    const direction = Math.sign(scores[axis] - 50);
    const entries = clean
      .map((a) => {
        const q = questions.find((qq) => qq.id === a.q);
        if (!q || q.kind === "free-text" || q.kind === "email") return null;
        const option = q.options.find((o) => o.id === a.o);
        const centred = centredOptionVector(q, a.o);
        if (!option || !centred) return null;
        const contribution = centred[axisIndex];
        if (Math.abs(contribution) < 2.5) return null;
        if (direction !== 0 && Math.sign(contribution) !== direction) return null;
        return { questionId: a.q, prompt: q.prompt, optionText: option.text, delta: Math.round(contribution), framework: q.framework, magnitude: Math.abs(contribution) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((x, y) => y.magnitude - x.magnitude || x.questionId.localeCompare(y.questionId));
    result[axis] = entries.slice(0, 2).map(({ magnitude: _m, ...rest }) => {
      void _m;
      return rest;
    });
  });

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

// ---------- Axis interactions ----------
//
// An archetype is a combination, not a list of four numbers. These rules read
// the strongest pairwise interactions in a profile, each tied to the mechanism
// that explains it. Exactly two readings are always returned so the report has
// a fixed structure; fillers cover profiles with fewer than two clear pairings.

export interface InteractionReading {
  id: string;
  label: string;
  /** The two axes involved, or null when the reading concerns the whole profile. */
  axes: [AxisId, AxisId] | null;
  /** 0–100: how far both axes sit in the rule's direction. 0 for fillers. */
  strength: number;
  framework: string;
  mechanism: string;
  edge: string;
  risk: string;
  move: string;
}

type Direction = "high" | "low";
interface InteractionRule extends Omit<InteractionReading, "strength" | "axes"> {
  axes: [AxisId, AxisId];
  dirs: [Direction, Direction];
}

const INTERACTION_RULES: InteractionRule[] = [
  {
    id: "operator", label: "The Operator", axes: ["control", "visibility"], dirs: ["high", "low"],
    framework: "Bases of Social Power — French & Raven, 1959",
    mechanism: "You decide outcomes but keep your name off them: authority exercised through information and structure rather than a public seat.",
    edge: "Decisions land without a target on your back. Rivals aim at the visible people while you set the terms.",
    risk: "Credit drifts to whoever is seen. When budgets are cut, the invisible are cut first, however essential.",
    move: "Once a quarter, put your name on one decision in writing. Not for ego: for a record.",
  },
  {
    id: "standard-bearer", label: "The Standard-Bearer", axes: ["control", "visibility"], dirs: ["high", "high"],
    framework: "Expectation States Theory — Berger, Cohen & Zelditch, 1972",
    mechanism: "Visible command. People confer status on you before you ask, and you accept it. Your authority compounds because it is seen.",
    edge: "Rooms organise around you fast. Speed of decision is your structural advantage.",
    risk: "The visibility that confers status also filters what reaches you. By year three, people edit reality before it gets to you.",
    move: "Pay one person to disagree with you in writing every week. Make dissent structural, not optional.",
  },
  {
    id: "performer", label: "The Performer", axes: ["control", "visibility"], dirs: ["low", "high"],
    framework: "Impression Management — Goffman, 1959",
    mechanism: "You are seen more than you steer. Attention is real currency, but it is being spent on a stage rather than a decision.",
    edge: "You can move a room's mood in minutes. Recruiting, selling and rallying come naturally.",
    risk: "A spokesperson is not a principal. Without decision rights, your visibility serves someone else's outcome.",
    move: "Convert one platform into one decision you own outright. Trade some applause for a signature.",
  },
  {
    id: "ghost", label: "The Ghost", axes: ["control", "visibility"], dirs: ["low", "low"],
    framework: "Strength of Weak Ties — Granovetter, 1973",
    mechanism: "Neither commanding nor seen. Your influence runs through relationships and timing: who you know, when you call.",
    edge: "You are impossible to target and easy to underestimate. Both are assets in the right game.",
    risk: "Without a claim or a face, leverage decays into irrelevance. People forget the architect of wins they enjoyed.",
    move: "Name your leverage to yourself in one sentence. If you cannot, you do not yet have it.",
  },
  {
    id: "patient-threat", label: "The Patient Threat", axes: ["timeHorizon", "powerSource"], dirs: ["high", "high"],
    framework: "Credible Commitment — Schelling, 1960",
    mechanism: "You play long and you carry consequence. People pre-empt you because they have watched you wait, and then act.",
    edge: "Deterrence. Most fights never happen because the other side has already done the math.",
    risk: "Living in the long game with a loaded weapon breeds suspicion. You start seeing threats that are only noise.",
    move: "One visible act of mercy a year, chosen deliberately. It keeps the deterrent credible rather than paranoid.",
  },
  {
    id: "cultivator", label: "The Cultivator", axes: ["timeHorizon", "powerSource"], dirs: ["high", "low"],
    framework: "Reciprocity and Social Capital — Cialdini, 1984; Coleman, 1988",
    mechanism: "Patience plus pull. You compound relationships the way others compound capital, and you are rarely the one who calls the debt.",
    edge: "People stay. Loyalty built this way survives your bad years.",
    risk: "Warmth without a spine becomes service. The network loves you and ignores your asks.",
    move: "One hard no per quarter that costs you a room. Pull only holds value if it can be withdrawn.",
  },
  {
    id: "enforcer", label: "The Enforcer", axes: ["timeHorizon", "powerSource"], dirs: ["low", "high"],
    framework: "Dominance Contest — Mazur, 1985",
    mechanism: "Fast and forceful. You settle questions of status in the moment rather than letting them ripen.",
    edge: "Nobody tests you twice. Your reputation fights the second round for you.",
    risk: "Every bridge burned early was a road you might have needed later. Speed spends relationships.",
    move: "A 24-hour rule for any response that cannot be undone. Not softer: later.",
  },
  {
    id: "sprinter", label: "The Sprinter", axes: ["timeHorizon", "powerSource"], dirs: ["low", "low"],
    framework: "Approach Motivation — Gable, 2006",
    mechanism: "Fast and warm. You open doors quickly and leave before anyone can close them on you.",
    edge: "Opportunity finds you because you are already moving when it appears.",
    risk: "Nothing compounds. Ten quick wins are worth less than one position held through the boring middle.",
    move: "Choose one thing you would normally exit and stay twelve more months. Learn what compounding feels like.",
  },
  {
    id: "commander-moment", label: "Commander of the Moment", axes: ["control", "timeHorizon"], dirs: ["high", "low"],
    framework: "Recognition-Primed Decision — Klein, 1998",
    mechanism: "You decide fast and you decide for others. Your first read is usually good, which is exactly why you stop checking.",
    edge: "In a crisis you are the calmest and fastest person in the room.",
    risk: "Pattern recognition that works nine times fails on the tenth: the one that looked familiar and was not.",
    move: "For any decision above a threshold you set, one deliberate 48-hour delay. Keep the instinct; add the check.",
  },
  {
    id: "institution", label: "The Institution-Builder", axes: ["control", "timeHorizon"], dirs: ["high", "high"],
    framework: "Generativity — Erikson, 1950",
    mechanism: "Command in service of something that outlasts you. You build rules, then people, then a thing that no longer needs you.",
    edge: "What you build works when you are not in the room. That is rarer than talent.",
    risk: "Rules outlive their reasons. The structure that protected the mission starts protecting itself.",
    move: "Kill one rule a quarter. If nothing breaks, it was dead already.",
  },
  {
    id: "magnet", label: "The Magnet", axes: ["visibility", "powerSource"], dirs: ["high", "low"],
    framework: "Referent Power — French & Raven, 1959",
    mechanism: "Seen and wanted. People move toward you without being asked, and you make sure they can see where you are.",
    edge: "Attention and affection arrive together. Building an audience costs you less than it costs anyone else.",
    risk: "No teeth. When someone finally crosses you, the room waits to see whether you can do anything about it.",
    move: "State one consequence in public and follow through once. Magnetism with one demonstrated edge is a different weapon.",
  },
  {
    id: "unseen-hand", label: "The Unseen Hand", axes: ["visibility", "powerSource"], dirs: ["low", "high"],
    framework: "Coercive Power under Low Visibility — French & Raven, 1959",
    mechanism: "Feared more than known. Your consequence is real; your face is not attached to it.",
    edge: "Rumour does your work. People imagine you larger than you are.",
    risk: "A vacuum fills with stories. Without a record, the stories are written by others, and rarely in your favour.",
    move: "One on-the-record position a quarter, in your own words. Let the record compete with the rumour.",
  },
];

const CHAMELEON_FILLER: Omit<InteractionReading, "strength"> = {
  id: "chameleon", label: "The Chameleon", axes: null,
  framework: "Self-Monitoring — Snyder, 1974",
  mechanism: "No axis sits far from neutral. You read rooms and adapt; your power style is whichever one the situation rewards.",
  edge: "You can work with every archetype because you can pass as most of them.",
  risk: "No signature means no reputation. People cannot predict you, so they cannot rely on you.",
  move: "Pick one axis and commit to it for six months. A signature is a choice before it is a trait.",
};

const LEAD_AXIS_FILLER: Omit<InteractionReading, "strength"> = {
  id: "lead-axis", label: "Choosing a Lead Axis", axes: null,
  framework: "Situational Strength — Mischel, 1977",
  mechanism: "With every axis near the middle, your behaviour is decided by the situation more than by a fixed style. That keeps you adaptable, and it also means other people cannot predict which version of you will show up.",
  edge: "Few rooms find you difficult. You can work alongside almost any archetype.",
  risk: "Without a lead axis, the strongest personality in the room tends to set your direction for you.",
  move: "For the next month, pick the one axis your goals need most and lean into it deliberately in one recurring situation.",
};

const BALANCED_FILLER: Omit<InteractionReading, "strength"> = {
  id: "balanced", label: "Balanced Elsewhere", axes: null,
  framework: "Situational Strength — Mischel, 1977",
  mechanism: "Outside the pairing above, your remaining axes sit close to the middle. That is range, not indecision: the pairing is your signature, the rest flexes to the room.",
  edge: "One clear edge plus adaptability everywhere else is the profile most effective leaders actually have.",
  risk: "The flexible axes are where you get talked out of things. Know which ones they are.",
  move: "Name your flexible axes to one person who watches you work. Ask them where you bend most.",
};

/** Both axes must sit at least this far from neutral (in the rule's direction) for a rule to fire. */
const INTERACTION_THRESHOLD = 8;

/** Mid band is 34–66; "neutral" for the Chameleon reading means every axis sits inside it. */
const MID_BAND_HALF_WIDTH = 17;

const AXIS_FRAMEWORK: Record<AxisId, string> = {
  control: "Locus of Control — Rotter, 1966",
  visibility: "Public Self-Consciousness — Fenigstein, Scheier & Buss, 1975",
  timeHorizon: "Consideration of Future Consequences — Strathman et al., 1994",
  powerSource: "Bases of Social Power — French & Raven, 1959",
};

/** A reading for one pronounced axis, used when no pairing rule applies to it. */
function singleAxisReading(scores: AxisScores, axis: AxisId): InteractionReading {
  const value = scores[axis];
  const band: "high" | "low" = value >= 50 ? "high" : "low";
  const r = READINGS[axis][band];
  return {
    id: `axis-${axis}-${band}`,
    label: `Your sharpest axis: ${band === "high" ? "High" : "Low"} ${axisLongLabels[axis]}`,
    axes: null,
    strength: Math.round((100 * Math.abs(value - 50)) / 45),
    framework: AXIS_FRAMEWORK[axis],
    mechanism: `${axisLongLabels[axis]} at ${value} is the furthest of your four axes from neutral, and none of the pairings around it reaches the threshold for a combined reading. ${r.strength}`,
    edge: r.strength,
    risk: r.warning,
    move: r.practice,
  };
}

/**
 * Exactly two readings, always mutually consistent:
 *  - up to two pairing rules that genuinely fire, strongest first;
 *  - otherwise the most pronounced single axes not already covered;
 *  - the Chameleon reading only when every axis sits in the mid band.
 */
export function interactionReadings(scores: AxisScores): InteractionReading[] {
  const fired = INTERACTION_RULES
    .map((rule) => {
      const [a, b] = rule.axes;
      const [da, db] = rule.dirs;
      const sa = da === "high" ? scores[a] - 50 : 50 - scores[a];
      const sb = db === "high" ? scores[b] - 50 : 50 - scores[b];
      const qualifies = sa >= INTERACTION_THRESHOLD && sb >= INTERACTION_THRESHOLD;
      const strength = qualifies ? Math.round(100 * Math.min(1, Math.sqrt((sa / 45) * (sb / 45)))) : 0;
      return { rule, strength };
    })
    .filter((x) => x.strength > 0)
    .sort((x, y) => y.strength - x.strength);

  const out: InteractionReading[] = fired.slice(0, 2).map(({ rule, strength }) => {
    const { dirs: _dirs, ...rest } = rule;
    void _dirs;
    return { ...rest, strength };
  });
  if (out.length === 2) return out;

  const allMid = AXIS_ORDER.every((ax) => Math.abs(scores[ax] - 50) < MID_BAND_HALF_WIDTH);
  if (out.length === 0 && allMid) {
    return [{ ...CHAMELEON_FILLER, strength: 0 }, { ...LEAD_AXIS_FILLER, strength: 0 }];
  }

  const covered = new Set(out.flatMap((r) => r.axes ?? []));
  const candidates = AXIS_ORDER
    .filter((ax) => !covered.has(ax) && Math.abs(scores[ax] - 50) >= MID_BAND_HALF_WIDTH)
    .sort((x, y) => Math.abs(scores[y] - 50) - Math.abs(scores[x] - 50));
  for (const ax of candidates) {
    if (out.length === 2) break;
    out.push(singleAxisReading(scores, ax));
  }
  if (out.length === 1) out.push({ ...BALANCED_FILLER, strength: 0 });
  if (out.length === 0) out.push({ ...CHAMELEON_FILLER, strength: 0 }, { ...LEAD_AXIS_FILLER, strength: 0 });
  return out.slice(0, 2);
}

// ---------- Answer consistency (paired questions) ----------
//
// Eight pairs of questions probe the same construct from two angles. When a
// respondent's two answers pull in opposite directions, that is not noise to
// be averaged away: it is an if-then signature (Mischel & Shoda, 1995 —
// Cognitive-Affective Personality System). Inconsistency indices of this kind
// are standard in serious instruments (cf. VRIN, Tellegen, 1988). We surface
// the pairs, name the axis they disagree on, and say what it usually means.

export interface ContradictionPair {
  id: string;
  a: string;
  b: string;
  construct: string;
}

export const CONTRADICTION_PAIRS: ContradictionPair[] = [
  { id: "power-basis", a: "q02", b: "q22", construct: "how your influence actually works" },
  { id: "recognition", a: "q05", b: "q21", construct: "what recognition is for" },
  { id: "threat-tempo", a: "q04", b: "q09", construct: "how you answer a threat" },
  { id: "time-pressure", a: "q11", b: "q23", construct: "speed versus compounding" },
  { id: "command-style", a: "q06", b: "q12", construct: "how you run a group" },
  { id: "public-face", a: "q03", b: "q16", construct: "your public face" },
  { id: "status-entry", a: "q01", b: "q06b", construct: "how you claim status" },
  { id: "influence-mode", a: "q18", b: "q06c", construct: "how you change minds" },
];

export type PairAgreement = "contradiction" | "neutral" | "consistent";

export interface PairReading {
  pairId: string;
  construct: string;
  questionA: { id: string; prompt: string; optionText: string };
  questionB: { id: string; prompt: string; optionText: string };
  /** −100..100: direction agreement between the two chosen options. */
  cosine: number;
  agreement: PairAgreement;
  /** The axis on which the two answers diverge most. */
  axis: AxisId;
  reading: string;
}

export interface ConsistencyResult {
  pairs: PairReading[];
  answered: number;
  agreeing: number;
  contradicting: number;
  /** agreeing / answered as 0–100, or null if no pair was fully answered. */
  index: number | null;
}

const CONTRADICTION_COPY: Record<AxisId, string> = {
  control:
    "In one scenario you take the wheel; in the other you hand it over. Control, for you, is situational: you command when the stakes are yours and defer when they are not. Ask which of the two the room you are in right now resembles.",
  visibility:
    "You want credit in one arena and anonymity in another. Many effective people run exactly this split: visible where reputation pays, invisible where it costs. Make the rule explicit so it stops looking like inconsistency to the people watching.",
  timeHorizon:
    "You will wait years in one situation and strike within hours in another. Tempo is your dial, not your trait. The risk is applying the wrong tempo out of habit; the edge is that opponents cannot predict which one they will get.",
  powerSource:
    "Force in one room, warmth in another. Most people default to one; you switch. That is either range or an unresolved question about which one is really you. Watch which you reach for when tired: that is the default.",
};

const CONTRADICTION_COS = -0.15;
const CONSISTENT_COS = 0.15;

export function evaluateContradictions(answers: { q: string; o: string }[]): ConsistencyResult {
  const byId = new Map<string, string>();
  for (const a of answers) if (a && typeof a.q === "string" && !byId.has(a.q)) byId.set(a.q, a.o);
  const pairs: PairReading[] = [];

  for (const pair of CONTRADICTION_PAIRS) {
    const qa = questions.find((q) => q.id === pair.a);
    const qb = questions.find((q) => q.id === pair.b);
    if (!qa || !qb || qa.kind === "free-text" || qa.kind === "email" || qb.kind === "free-text" || qb.kind === "email") continue;
    const oa = byId.get(pair.a);
    const ob = byId.get(pair.b);
    if (!oa || !ob) continue;
    const va = centredOptionVector(qa, oa);
    const vb = centredOptionVector(qb, ob);
    const optA = qa.options.find((o) => o.id === oa);
    const optB = qb.options.find((o) => o.id === ob);
    if (!va || !vb || !optA || !optB) continue;

    const cos = cosine(va, vb);
    const agreement: PairAgreement = cos < CONTRADICTION_COS ? "contradiction" : cos > CONSISTENT_COS ? "consistent" : "neutral";
    const argmax = (score: (i: number) => number) => {
      let best = 0;
      AXIS_ORDER.forEach((_, i) => { if (score(i) > score(best)) best = i; });
      return best;
    };
    // Name the axis that actually explains the verdict: where the answers
    // agree most (consistent), where they pull in opposite directions
    // (contradiction), or each answer's own main axis (neutral).
    const axisIndex =
      agreement === "consistent"
        ? argmax((i) => va[i] * vb[i])
        : agreement === "contradiction"
          ? argmax((i) => (va[i] * vb[i] < 0 ? Math.abs(va[i] - vb[i]) : -1))
          : argmax((i) => Math.abs(va[i]));
    const axis = AXIS_ORDER[axisIndex];
    const otherAxis = AXIS_ORDER[argmax((i) => Math.abs(vb[i]))];
    const reading =
      agreement === "contradiction"
        ? CONTRADICTION_COPY[axis]
        : agreement === "consistent"
          ? `Both answers pull the same way on ${axisLabels[axis]}. This part of your signature holds across situations, which is what makes it predictable to others.`
          : axis === otherAxis
            ? `These two answers lean on ${axisLabels[axis]} to different degrees without contradicting each other. Read them together: the situation changes how strongly this trait shows, not whether it does.`
            : `These two answers measure different things: the first leans mainly on ${axisLabels[axis]}, the second on ${axisLabels[otherAxis]}. Neither contradicts the other; together they show which trait each situation brings out.`;

    pairs.push({
      pairId: pair.id,
      construct: pair.construct,
      questionA: { id: qa.id, prompt: qa.prompt, optionText: optA.text },
      questionB: { id: qb.id, prompt: qb.prompt, optionText: optB.text },
      cosine: Math.round(100 * cos),
      agreement,
      axis,
      reading,
    });
  }

  const rank = (p: PairReading) => (p.agreement === "contradiction" ? 0 : p.agreement === "neutral" ? 1 : 2);
  pairs.sort((x, y) => rank(x) - rank(y) || x.cosine - y.cosine);

  const answered = pairs.length;
  const agreeing = pairs.filter((p) => p.agreement === "consistent").length;
  const contradicting = pairs.filter((p) => p.agreement === "contradiction").length;
  return { pairs, answered, agreeing, contradicting, index: answered ? Math.round((100 * agreeing) / answered) : null };
}

// ---------- Helpers ----------

export function topArchetypes(blend: BlendEntry[], n = 3): BlendEntry[] {
  return blend.slice(0, n).filter((x) => x.percent >= 4);
}

export function getArchetype(id: string): Archetype | undefined {
  return archetypes.find((a) => a.id === id);
}
