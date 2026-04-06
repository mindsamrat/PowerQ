export interface Archetype {
  name: string;
  slug: string;
  icon: string;
  oneLiner: string;
  center: { control: number; visibility: number; patience: number };
  freeDescription: string;
  paidTeaser: string[];
}

export const archetypes: Archetype[] = [
  {
    name: "The Sovereign",
    slug: "sovereign",
    icon: "crown",
    oneLiner: "Commands the room. Builds kingdoms openly.",
    center: { control: 90, visibility: 85, patience: 60 },
    freeDescription:
      "You don't ask for authority. You assume it. People naturally defer to your presence because you operate like power is your birthright. Your risk: believing your own mythology. Sovereigns who stop listening become tyrants. Sovereigns who stay sharp become dynasties.",
    paidTeaser: [
      "Deep analysis of how Sovereigns rise and fall across history",
      "The 3 blind spots that destroy Sovereign types",
      "5 tactical power moves designed for your archetype",
      "How you match up against every other archetype",
      "Your specific vulnerabilities in relationships and business",
    ],
  },
  {
    name: "The Shadow King",
    slug: "shadow-king",
    icon: "eye",
    oneLiner: "Controls outcomes no one traces back.",
    center: { control: 85, visibility: 15, patience: 90 },
    freeDescription:
      "The most dangerous person in any room is the one nobody suspects. You accumulate leverage quietly, move pieces from behind the curtain, and let others take credit while you take control. Your risk: isolation. Power without allies is a fortress with no exits.",
    paidTeaser: [
      "How Shadow Kings have shaped empires without anyone knowing",
      "The 3 traps that expose and destroy Shadow Kings",
      "5 moves to strengthen your invisible power base",
      "Which archetypes threaten you and which ones you dominate",
      "The isolation paradox and how to solve it",
    ],
  },
  {
    name: "The Architect",
    slug: "architect",
    icon: "compass",
    oneLiner: "Designs systems that outlive their creator.",
    center: { control: 65, visibility: 45, patience: 90 },
    freeDescription:
      "You don't play the current game. You design the next one. Systems, structures, long-term positioning. While others fight over today's prize, you're building something that compounds for decades. Your risk: paralysis by planning. The blueprint means nothing without execution.",
    paidTeaser: [
      "The system-building framework that Architects use to outlast everyone",
      "The 3 ways Architects sabotage their own plans",
      "5 execution strategies to turn vision into power",
      "Your advantage and vulnerability against each archetype",
      "When to stop designing and start commanding",
    ],
  },
  {
    name: "The Disruptor",
    slug: "disruptor",
    icon: "flame",
    oneLiner: "Burns the old order and builds from the ashes.",
    center: { control: 75, visibility: 85, patience: 15 },
    freeDescription:
      "You thrive in chaos. When everyone clings to the old order, you're already burning it down and building from the ashes. Speed, boldness, and an allergic reaction to the status quo define you. Your risk: destruction without construction. Breaking things is easy. Building what replaces them is the actual test.",
    paidTeaser: [
      "Why Disruptors either change the world or destroy themselves",
      "The 3 moments where your instinct for chaos betrays you",
      "5 ways to channel destruction into lasting power",
      "Which archetypes you crush and which ones crush you",
      "The discipline framework Disruptors need to build empires",
    ],
  },
  {
    name: "The Diplomat",
    slug: "diplomat",
    icon: "scales",
    oneLiner: "Wins wars without anyone knowing there was one.",
    center: { control: 45, visibility: 65, patience: 75 },
    freeDescription:
      "You win wars that nobody knew were being fought. Alliances, positioning, strategic friendships. Your power comes from being the person everyone needs but nobody fears. Your risk: being too comfortable in the middle. Diplomats who never pick a side become irrelevant.",
    paidTeaser: [
      "The invisible war strategy that makes Diplomats indispensable",
      "The 3 situations where neutrality becomes your weakness",
      "5 moves to convert soft power into hard authority",
      "Your natural allies and your most dangerous opponents",
      "When to stop negotiating and start commanding",
    ],
  },
  {
    name: "The Mercenary",
    slug: "mercenary",
    icon: "dagger",
    oneLiner: "Moves fast. Extracts value. No sentiment.",
    center: { control: 55, visibility: 45, patience: 20 },
    freeDescription:
      "You move fast, extract value, and don't get sentimental about what you leave behind. Opportunity is your compass. Loyalty is conditional. You thrive in environments where others hesitate. Your risk: no compounding. Mercenaries get rich. They rarely build empires.",
    paidTeaser: [
      "Why Mercenaries win battles but struggle to build dynasties",
      "The 3 patterns that keep Mercenaries from compounding power",
      "5 strategies to convert speed into lasting leverage",
      "How you fare against each archetype in direct confrontation",
      "The loyalty calculation that separates rich from powerful",
    ],
  },
];

export function calculateScores(answers: { control: number; visibility: number; patience: number }[]) {
  const totals = { control: 0, visibility: 0, patience: 0 };

  for (const answer of answers) {
    totals.control += answer.control;
    totals.visibility += answer.visibility;
    totals.patience += answer.patience;
  }

  const count = answers.length;
  const avgControl = totals.control / count;
  const avgVisibility = totals.visibility / count;
  const avgPatience = totals.patience / count;

  // Find closest archetype by Euclidean distance
  let closestArchetype = archetypes[0];
  let minDistance = Infinity;

  for (const archetype of archetypes) {
    const distance = Math.sqrt(
      Math.pow(avgControl - archetype.center.control, 2) +
      Math.pow(avgVisibility - archetype.center.visibility, 2) +
      Math.pow(avgPatience - archetype.center.patience, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestArchetype = archetype;
    }
  }

  // Power Score = (Control * 0.4) + (Visibility * 0.3) + (Patience * 0.3)
  const powerScore = Math.round(avgControl * 0.4 + avgVisibility * 0.3 + avgPatience * 0.3);

  return {
    archetype: closestArchetype,
    powerScore: Math.min(100, Math.max(0, powerScore)),
    axes: {
      control: Math.round(avgControl),
      visibility: Math.round(avgVisibility),
      patience: Math.round(avgPatience),
    },
  };
}
