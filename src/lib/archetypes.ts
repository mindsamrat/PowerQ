export interface Archetype {
  name: string;
  slug: string;
  icon: string;
  oneLiner: string;
  center: { control: number; visibility: number; patience: number };
  freeDescription: string;
  deepAnalysis: string;
  neuroscience: string;
  blindSpot: string;
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
    deepAnalysis:
      "Your neural architecture is wired for dominance hierarchy recognition. You instinctively scan for power vacuums and fill them. Your prefrontal cortex runs a constant status-calculation algorithm that most people never consciously activate. This is not arrogance. It is pattern recognition operating at a frequency others cannot access. The Sovereign phenotype appears in roughly 8% of the population, but only 2% learn to sustain it without self-destruction.",
    neuroscience:
      "Elevated baseline testosterone combined with moderate cortisol creates your signature confidence-without-recklessness profile. Your anterior cingulate cortex shows heightened activity during social hierarchy processing, meaning you literally perceive status dynamics that others miss entirely. Your dopaminergic reward system is tuned to respond most intensely to authority acquisition, not material gain.",
    blindSpot:
      "Your mirror neuron system is selectively suppressed during power acquisition. Translation: you stop reading the room precisely when you most need to. The same neural circuitry that makes you decisive makes you deaf to dissent. History's fallen Sovereigns share one pattern: they confused silence for agreement.",
    paidTeaser: [
      "Your complete neuropsychological power profile across 12 dimensions",
      "The 3 cognitive biases that destroy Sovereign types from within",
      "Your specific vulnerability matrix against each archetype",
      "5 tactical protocols calibrated to your neural wiring",
      "Historical case studies of Sovereign rise and collapse patterns",
      "Your shadow archetype and how it undermines you in crisis",
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
    deepAnalysis:
      "Your cognitive architecture prioritizes information asymmetry as the primary power currency. Where Sovereigns display, you conceal. Your working memory capacity is likely above the 90th percentile, allowing you to track multiple social variables simultaneously without external aids. You process social dynamics through a strategic lens that most people reserve only for chess or financial modeling. The Shadow King phenotype is the rarest, appearing in approximately 4% of the population.",
    neuroscience:
      "Your default mode network shows unusual activation during social observation. You are literally running predictive simulations about other people's behavior while appearing passive. Your amygdala response to social threats is delayed, not absent. You feel the threat, but your prefrontal override is strong enough to suppress the visible reaction, creating what others experience as inscrutability. Your reward circuitry fires hardest not on visible victory, but on successful prediction.",
    blindSpot:
      "Chronic concealment creates what neuroscience calls 'emotional debt.' Your suppressed amygdala responses accumulate as somatic stress. The Shadow King's greatest vulnerability is not exposure. It is the slow erosion of authentic connection that eventually leaves your intelligence network hollow. You optimize for information but starve for trust.",
    paidTeaser: [
      "Your complete covert influence profile across 12 psychological dimensions",
      "The isolation paradox: why your greatest strength becomes your fatal flaw",
      "How your attachment style sabotages your network at critical moments",
      "5 advanced leverage protocols designed for your cognitive architecture",
      "The 3 archetypes that can detect and neutralize your strategies",
      "Your neurological stress signature and how it leaks your position",
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
    deepAnalysis:
      "Your cognitive style is dominated by what psychologists call 'temporal abstraction.' You naturally think in systems, feedback loops, and second-order consequences. Your brain runs Monte Carlo simulations about the future while others react to the present. This gives you an almost prophetic quality in long-horizon domains, but creates a characteristic blind spot in situations requiring immediate, imperfect action. Approximately 11% of the population shares this phenotype, but most never develop it into a power advantage.",
    neuroscience:
      "Your dorsolateral prefrontal cortex shows elevated sustained activation. This is the brain region responsible for planning, working memory, and cognitive flexibility. Your temporal discounting curve is unusually flat, meaning you assign nearly equal value to future rewards as present ones. This is neurologically rare. Most human brains discount future value by 50-80%. Yours discounts by perhaps 15-20%, giving you a structural advantage in any domain where patience compounds.",
    blindSpot:
      "Your planning superiority creates what cognitive scientists call 'analysis paralysis at scale.' Your simulations become so detailed that execution feels like a downgrade from the perfect model in your head. The gap between your vision and reality's messiness triggers a subtle but chronic dissatisfaction that can freeze you at the threshold of action. The Architect's enemy is not failure. It is the refusal to begin.",
    paidTeaser: [
      "Your systems-thinking profile mapped across 12 cognitive dimensions",
      "The execution gap: why your plans stall and how to override the freeze",
      "Your specific planning biases and how they distort your models",
      "5 implementation protocols designed for your temporal abstraction style",
      "Which archetypes exploit your patience and how to counter them",
      "The perfectionism-procrastination loop and how to break it permanently",
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
    deepAnalysis:
      "Your neural signature is defined by elevated novelty-seeking and reduced loss aversion. Where most brains weight potential losses 2.5x more than equivalent gains, yours operates closer to a 1:1 ratio. This is not recklessness. It is a fundamentally different risk-reward calibration that gives you access to opportunities the loss-averse majority cannot even perceive. You process uncertainty as stimulation rather than threat. Roughly 9% of the population shares this phenotype, but cultural conditioning suppresses it in most.",
    neuroscience:
      "Your ventral striatum shows heightened activation in response to novelty and uncertainty. Your brain literally produces more dopamine in chaotic environments than stable ones. Your norepinephrine system runs at a higher baseline, creating the restless energy others perceive as intensity or impatience. Under pressure, your prefrontal cortex actually becomes more efficient, not less. This is the neurological basis of your 'anti-fragility.' You perform better when everything is on fire.",
    blindSpot:
      "Your dopaminergic reward system creates a dependency on novelty that makes sustained effort on a single trajectory neurologically uncomfortable. You experience what psychologists call 'hedonic adaptation to stability.' Success itself becomes boring, triggering the unconscious urge to destabilize what you built. The Disruptor's deepest pattern is not the fear of failure. It is the inability to tolerate the quiet discipline that separates disruption from lasting power.",
    paidTeaser: [
      "Your complete chaos-tolerance profile across 12 neural dimensions",
      "The destruction-construction ratio that predicts Disruptor success or burnout",
      "Your novelty addiction signature and how it sabotages your own empires",
      "5 channeling protocols to convert your intensity into compound momentum",
      "Which archetypes absorb your energy and which ones amplify it",
      "The stability protocol: how to build without losing your edge",
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
    deepAnalysis:
      "Your cognitive architecture is optimized for what game theorists call 'iterated cooperation.' You instinctively model multi-round interactions and calibrate your behavior to maximize long-term relational capital. Your theory of mind is highly developed. You can simultaneously hold multiple perspectives and predict how different actors will respond to the same stimulus. This makes you the most socially intelligent archetype, but also the most vulnerable to decisional paralysis when alliances conflict. Approximately 15% of the population shares this phenotype.",
    neuroscience:
      "Your temporoparietal junction and medial prefrontal cortex show co-activation patterns associated with advanced perspective-taking. Your oxytocin receptor density is likely above average, creating genuine pleasure from social bonding and trust-building. But this same neurochemistry creates your vulnerability: you experience betrayal not just as strategic loss, but as physiological pain. Your anterior insula processes social rejection through the same pathways as physical injury.",
    blindSpot:
      "Your relational optimization creates what psychologists call 'alliance addiction.' You derive so much neurochemical reward from being needed that you unconsciously avoid positions that would force people to choose against you. The Diplomat's deepest fear is not losing a battle. It is losing a relationship. This makes you the most liked archetype and the least likely to seize power when the window is narrow. Your agreeableness, unchecked, becomes a cage.",
    paidTeaser: [
      "Your complete social intelligence profile across 12 relational dimensions",
      "The neutrality trap: why your greatest strength becomes your ceiling",
      "Your specific conflict-avoidance patterns and how they cost you leverage",
      "5 assertion protocols designed for your cooperative neural wiring",
      "Which archetypes exploit your need for harmony and how to counter them",
      "The decisive pivot: how to convert soft power into hard authority",
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
    deepAnalysis:
      "Your cognitive profile is defined by elevated present-bias and exceptional opportunity recognition. Your brain processes environmental cues for value extraction faster than any other archetype. You see leverage where others see noise. Your attachment style under professional stress defaults to avoidant, allowing you to sever connections with minimal emotional cost. This is not sociopathy. It is a survival optimization that trades depth for speed. Roughly 13% of the population shares this phenotype, making it the second most common archetype.",
    neuroscience:
      "Your ventromedial prefrontal cortex shows rapid valuation processing. You literally assign monetary and strategic value to opportunities faster than other cognitive profiles. Your serotonin transporter gene variant likely predisposes you toward action over reflection. Your cortisol recovery rate is fast, meaning you bounce back from stress and loss more quickly than average, but this same mechanism prevents you from fully processing the relational consequences of your decisions.",
    blindSpot:
      "Your speed advantage creates what economists call the 'velocity trap.' You extract value so efficiently from each position that you never stay long enough to benefit from compounding returns. Your neural reward system is calibrated for acquisition, not accumulation. The Mercenary's deepest pattern is not greed. It is the neurological inability to experience delayed gratification as rewarding. You are always optimizing for the next move when the real power was in staying.",
    paidTeaser: [
      "Your complete value-extraction profile across 12 cognitive dimensions",
      "The velocity trap: why speed becomes your ceiling after initial success",
      "Your attachment avoidance pattern and how it limits your power base",
      "5 compounding protocols designed to work with your present-biased wiring",
      "Which archetypes can anchor you and which ones drain your momentum",
      "The empire framework: how Mercenaries evolve into dynasty builders",
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
