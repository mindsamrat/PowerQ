export interface AxisRange {
  min: number;
  max: number;
}

export interface Archetype {
  id: string;
  name: string;
  /** Short-form identity line. Shown on reveal and on the shareable card. */
  tagline: string;
  control: AxisRange;
  visibility: AxisRange;
  timeHorizon: AxisRange;
  powerSource: AxisRange;
  /** Seeded rarity %. Rebalance after 5,000 completions. */
  rarity: number;
  enemyId: string;
  /** 2-3 sentence warning of how this archetype self-destructs. */
  shadowGift: string;
  /** Accent color used on the archetype's shareable card. */
  cardAccent: string;
}

export const archetypes: Archetype[] = [
  {
    id: "sovereign",
    name: "The Sovereign",
    tagline: "Commands openly. Builds visible kingdoms.",
    control: { min: 80, max: 100 },
    visibility: { min: 70, max: 100 },
    timeHorizon: { min: 60, max: 90 },
    powerSource: { min: 60, max: 80 },
    rarity: 8,
    enemyId: "shadow",
    shadowGift:
      "Your visibility makes you a target. You mistake loyalty for agreement. When you fall, it is from inside — not outside.",
    cardAccent: "#C9A54C",
  },
  {
    id: "shadow",
    name: "The Shadow",
    tagline: "Controls outcomes no one traces back.",
    control: { min: 70, max: 100 },
    visibility: { min: 0, max: 30 },
    timeHorizon: { min: 70, max: 100 },
    powerSource: { min: 70, max: 100 },
    rarity: 6,
    enemyId: "sovereign",
    shadowGift:
      "Concealment is a cost you don't feel until it's paid. Years of unspoken moves leave you with leverage and no one to spend it on. Your network knows you but does not trust you.",
    cardAccent: "#8A8C91",
  },
  {
    id: "architect",
    name: "The Architect",
    tagline: "Designs systems that outlive their creator.",
    control: { min: 50, max: 80 },
    visibility: { min: 30, max: 60 },
    timeHorizon: { min: 80, max: 100 },
    powerSource: { min: 40, max: 60 },
    rarity: 14,
    enemyId: "blade",
    shadowGift:
      "Your blueprints outrun your will to build. The plan feels so complete in your head that beginning feels like a downgrade. Most Architects never lose — they never start.",
    cardAccent: "#B08C5C",
  },
  {
    id: "oracle",
    name: "The Oracle",
    tagline: "Power through insight others cannot replicate.",
    control: { min: 30, max: 60 },
    visibility: { min: 40, max: 70 },
    timeHorizon: { min: 60, max: 90 },
    powerSource: { min: 0, max: 30 },
    rarity: 9,
    enemyId: "hunter",
    shadowGift:
      "You see three moves ahead and assume others do too. They don't. Your warnings land as arrogance because the ground you're pointing at isn't visible yet.",
    cardAccent: "#D4AF6C",
  },
  {
    id: "blade",
    name: "The Blade",
    tagline: "Burns the old order. Decisive, kinetic, feared.",
    control: { min: 70, max: 100 },
    visibility: { min: 70, max: 100 },
    timeHorizon: { min: 0, max: 30 },
    powerSource: { min: 70, max: 100 },
    rarity: 12,
    enemyId: "architect",
    shadowGift:
      "You cut before you're certain. Half your victories cost you more than losing would have. The archetype that beats you is the one who can wait longer than you can.",
    cardAccent: "#B8463E",
  },
  {
    id: "diplomat",
    name: "The Diplomat",
    tagline: "Wins without anyone knowing war was fought.",
    control: { min: 30, max: 60 },
    visibility: { min: 50, max: 80 },
    timeHorizon: { min: 60, max: 90 },
    powerSource: { min: 20, max: 40 },
    rarity: 18,
    enemyId: "flame",
    shadowGift:
      "Being liked by everyone is a cage disguised as a crown. You avoid the decisive move because it would cost you a room. The ceiling on your power is the number of alliances you refuse to break.",
    cardAccent: "#B89A6A",
  },
  {
    id: "hunter",
    name: "The Hunter",
    tagline: "Opportunist. Moves fast. Extracts value. Exits.",
    control: { min: 40, max: 70 },
    visibility: { min: 20, max: 50 },
    timeHorizon: { min: 0, max: 30 },
    powerSource: { min: 40, max: 70 },
    rarity: 15,
    enemyId: "oracle",
    shadowGift:
      "Your speed is your ceiling. You leave every position just before it would have compounded. You get rich in bursts and never build anything that remembers you.",
    cardAccent: "#9C6B3F",
  },
  {
    id: "flame",
    name: "The Flame",
    tagline: "Power through magnetism. Pulls rather than pushes.",
    control: { min: 20, max: 50 },
    visibility: { min: 80, max: 100 },
    timeHorizon: { min: 30, max: 60 },
    powerSource: { min: 0, max: 20 },
    rarity: 18,
    enemyId: "diplomat",
    shadowGift:
      "You burn through the people drawn to you faster than you replace them. Magnetism without structure is a performance that gets quieter every year. You confuse being watched with being followed.",
    cardAccent: "#C97A3F",
  },
];

export function getCentroid(a: Archetype) {
  return {
    control: (a.control.min + a.control.max) / 2,
    visibility: (a.visibility.min + a.visibility.max) / 2,
    timeHorizon: (a.timeHorizon.min + a.timeHorizon.max) / 2,
    powerSource: (a.powerSource.min + a.powerSource.max) / 2,
  };
}

export function getEnemy(a: Archetype): Archetype {
  const enemy = archetypes.find((x) => x.id === a.enemyId);
  if (!enemy) throw new Error(`Unknown enemy id ${a.enemyId} on ${a.id}`);
  return enemy;
}

/** 1-based rank from rarest (1) to most common (N). */
export function getRarityRank(a: Archetype): number {
  const sorted = [...archetypes].sort((x, y) => x.rarity - y.rarity);
  return sorted.findIndex((x) => x.id === a.id) + 1;
}

export function getArchetypeById(id: string): Archetype | undefined {
  return archetypes.find((a) => a.id === id);
}

// ---------- Axis narrative lines ----------
//
// Each axis has three score-band narratives. The results page picks the band
// matching the user's score (0-33 low, 34-66 mid, 67-100 high).

export type AxisId = "control" | "visibility" | "timeHorizon" | "powerSource";
export type ScoreBand = "low" | "mid" | "high";

export const axisLabels: Record<AxisId, string> = {
  control: "Control",
  visibility: "Visibility",
  timeHorizon: "Time-Horizon",
  powerSource: "Power-Source",
};

export const axisNarratives: Record<AxisId, Record<ScoreBand, string>> = {
  control: {
    low: "You lead through influence, not authority. You move people by getting them to agree, not obey.",
    mid: "You pick your moments. Order when it matters, space when it doesn't.",
    high: "You do not ask. You decide. Hierarchy is a tool you reach for without hesitation.",
  },
  visibility: {
    low: "You work in the dark. What you do is rarely tied back to you, and that is by design.",
    mid: "You choose when to be seen. Your reputation precedes you in some rooms, not all of them.",
    high: "You want your power seen. Recognition is not vanity; it's a multiplier you use consciously.",
  },
  timeHorizon: {
    low: "You move now. Speed is your weapon, and you trust the first read more than the second.",
    mid: "You hold tactical and strategic moves in the same hand. Patience is a tool, not a default.",
    high: "You play the long game. You will wait three years for a move others would have forced in three weeks.",
  },
  powerSource: {
    low: "You lead through pull, not pressure. People move toward you; they don't move because of what you'd do otherwise.",
    mid: "You mix warmth and weight. People feel both your charm and the cost of crossing you.",
    high: "You lead through weight, not warmth. Your leverage is consequence — people calculate you before they move.",
  },
};

export function bandFor(score: number): ScoreBand {
  if (score <= 33) return "low";
  if (score >= 67) return "high";
  return "mid";
}
