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
  /** 3 signature traits shown on the results page. */
  signatureTraits: string[];
  /** 3 short action recommendations calibrated to this archetype. */
  recommendations: string[];
  /** 3-4 mixed real / fictional examples for the paid PDF. */
  famousExamples: string[];
  /** 7 short imperatives ("laws") this archetype must live by. Used in the paid PDF. */
  laws: string[];
  /** 1-paragraph guide on how this archetype neutralises its natural enemy. Paid PDF only. */
  enemyTactics: string;
  /** 1-paragraph long-form description for the paid PDF "Your Archetype" page. */
  archetypeDepth: string;
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
    signatureTraits: [
      "You assume authority instead of asking for it.",
      "You lead best when everyone knows who is leading.",
      "You mistake silence from allies for agreement.",
    ],
    recommendations: [
      "Keep one advisor whose only job is to tell you what you are wrong about.",
      "Name your second. Sovereigns without a succession plan end badly.",
      "Write down the promises your team thinks you have made but have not said.",
    ],
    famousExamples: ["Julius Caesar", "Queen Elizabeth I", "Lee Kuan Yew", "Tywin Lannister"],
    laws: [
      "Never let a room you own decide what you'll do next.",
      "Reward loyalty in private. Punish disloyalty in public.",
      "Your second-in-command is the person you fall through. Pick them like a parachute.",
      "When the news is bad, deliver it yourself. When it's good, let someone else.",
      "A throne you have to defend constantly was never yours.",
      "Fear in your enemies is interest. Fear in your allies is debt.",
      "Build the institution that survives you. Anything less is performance.",
    ],
    enemyTactics:
      "The Shadow is built to neutralise you. They do not stand opposite you — they stand behind your decisions, shaping the inputs you trust. To survive a Shadow, you must accept that the room is never as clean as it looks. Audit your information sources quarterly: who has access, who filters what you see, who benefits from your blind spots. Reward people for telling you what you don't want to hear. The Shadow's only weapon is your assumption that your authority is enough. Take that assumption away and they have nothing.",
    archetypeDepth:
      "The Sovereign is the archetype of explicit authority — power that names itself, sits at the head of the table, and signs the document. Where other archetypes wield influence sideways, you wield it down. Your neural signature reads as elevated baseline confidence with moderate cortisol: the rare combination that lets you stay decisive without becoming reckless. Caesar built Rome's first imperial template by making his own ambition look like the empire's destiny. Elizabeth I inherited a fractured kingdom and turned visibility itself into armour — her image became the institution. Lee Kuan Yew converted a swamp into a city-state by treating every decision as a precedent. The pattern is consistent: Sovereigns build kingdoms that function with or without them, but they do this by making their own authority undeniable while they live.",
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
    signatureTraits: [
      "You treat information as the highest form of currency.",
      "You would rather be underestimated than correctly sized.",
      "You let others take credit for outcomes you designed.",
    ],
    recommendations: [
      "Pick one relationship a year where you practice being seen.",
      "Audit your leverage annually. Unused leverage rots into loneliness.",
      "Accept that the cost of concealment is compounding emotional debt.",
    ],
    famousExamples: ["Lorenzo de' Medici", "Madeleine Albright", "Littlefinger (GoT)", "Talleyrand"],
    laws: [
      "Never confirm what others suspect. Confirmation is leverage you've given away.",
      "Information you can't deploy is a liability, not an asset. Use leverage or release it.",
      "The credit you don't take builds the position you do.",
      "Build redundancy into every channel. One source is one revoked password from blindness.",
      "Visible enemies are decoys. Track who watches you watching them.",
      "A network is a memory. People remember being remembered. Spend on that.",
      "Surface yourself once a year. Total invisibility curdles into irrelevance.",
    ],
    enemyTactics:
      "The Sovereign is your natural enemy because they operate on the axis you reject — visibility. They cannot be neutralised by being out-thought, only by being out-waited or out-flanked through the people they trust. Never confront a Sovereign directly: you will lose the room. Instead, become indispensable to the people they rely on. Sovereigns over-trust the second tier because they assume their own selection is sound. Position yourself in that tier. When the moment comes that the Sovereign needs information they don't have, you become the bridge. The Sovereign falls inward, never outward. Your job is to be the person standing beside them when it happens.",
    archetypeDepth:
      "The Shadow is the rarest archetype — roughly 6% of respondents — and the most strategically formidable. You operate on a principle that most people find counterintuitive: power increases as visibility decreases. While the Sovereign builds kingdoms, you build the conditions that make kingdoms possible. Lorenzo de' Medici ran Florence for thirty years without ever holding formal office — he simply made the city's prosperity dependent on his network. Madeleine Albright shaped American foreign policy through information access more than rank. Talleyrand outlived four French regimes by being the person each new ruler couldn't function without. The Shadow's signature is patience that compounds — you accumulate small advantages that, individually, never reveal the pattern, but cumulatively become impossible to remove.",
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
    signatureTraits: [
      "You think in feedback loops and second-order consequences.",
      "You prefer structures that compound over moves that impress.",
      "You freeze at the edge of imperfect execution.",
    ],
    recommendations: [
      "Ship a v1 that embarrasses you. Iteration is the system you forgot to plan for.",
      "Pair with a Blade. Their impatience is your missing motor.",
      "Schedule monthly shipping deadlines you cannot renegotiate with yourself.",
    ],
    famousExamples: ["Charlie Munger", "Octavia Butler", "John Boyd", "Hari Seldon (Foundation)"],
    laws: [
      "Ship the v1 that embarrasses you. The plan is not the system.",
      "Constraints are gifts. Pick your constraint before the world picks one for you.",
      "Optimise for the version of you that exists in 10 years, not 10 minutes.",
      "Document your reasoning, not your conclusions. Conclusions age. Reasoning compounds.",
      "Pair with a Blade. Their impatience is your missing motor.",
      "The system you actually run beats the system you almost built every time.",
      "When the model is wrong, change the model — don't bend the data.",
    ],
    enemyTactics:
      "The Blade is built to undo you. Where you build slowly, they cut quickly. Where you map every contingency, they make a decision before your meeting starts. You cannot out-think a Blade in real time — they aren't trying to think, they're trying to move. The Architect's defence is structural, not tactical. Build systems that don't need your real-time presence: contracts, processes, dependencies that survive disruption. When a Blade attacks, the Architect who has shipped wins. The Architect who is still planning loses. Your discipline is to prefer 'good and shipped' over 'perfect and theoretical', especially in the presence of fast-moving threats.",
    archetypeDepth:
      "The Architect's signature is temporal abstraction — a brain that treats next decade and next minute with similar weight. Most human cognition discounts the future at 50–80%; yours operates closer to 15–20%, which is neurologically rare. You are wired for compound thinking. Charlie Munger built Berkshire's edge on a single mental model: long horizons + simple rules + ruthless avoidance of stupidity. Octavia Butler wrote books about systems that take centuries to play out. John Boyd's OODA loop wasn't a tactic — it was a system of systems that reshaped military doctrine for fifty years. The Architect's failure mode isn't failure; it's never-quite-starting. Every Architect's worst enemy is the perfect blueprint they refuse to downgrade by building.",
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
    signatureTraits: [
      "You think in patterns others only see in retrospect.",
      "You move people through insight, not pressure.",
      "Your warnings often feel like arrogance until they land.",
    ],
    recommendations: [
      "Keep a private log of your predictions with timestamps. Your track record is your leverage.",
      "Translate your patterns into concrete bets others can take — don't just narrate.",
      "Teach one person a year to read what you read. Oracles who die without apprentices die forgotten.",
    ],
    famousExamples: ["George Kennan", "Carl Jung", "Nate Silver", "Paul Atreides (Dune)"],
    laws: [
      "Insight you can't translate into a bet someone else takes is a hobby.",
      "Time-stamp every prediction. Your track record is the only credential that scales.",
      "Teach one apprentice a year. Oracles who die without students die forgotten.",
      "Most insight is wrong about timing, not direction. Plan accordingly.",
      "The room rarely listens the first time. Repeat the warning until you're proven boring or right.",
      "When you see what others can't, the burden of clarity is on you, not them.",
      "A pattern shared too early becomes a pattern stolen. Hold it until the listener is ready to act.",
    ],
    enemyTactics:
      "The Hunter is built to neutralise you because they ignore what you value most: the long pattern. Where you see the seven-year arc, the Hunter sees this week's opportunity and exits before your warning lands. Arguing with a Hunter about the future is futile — they discount it. Instead, structure the world so the present becomes their teacher. Hunters respect cost, not concept. If you can show a Hunter that this week's quick exit costs them something concrete this month, you have their attention. Otherwise, let them go. The Hunter's velocity is your patience's compound interest.",
    archetypeDepth:
      "The Oracle's signature is pattern recognition under uncertainty — the ability to see structure in noise that others can only confirm in retrospect. George Kennan watched Stalin's Russia in 1946 and wrote the Long Telegram, which framed forty years of American policy. Carl Jung mapped the unconscious mind through patterns most psychologists dismissed as anecdotal. Nate Silver turned poll-noise into prediction infrastructure. The Oracle's burden is twofold: first, the loneliness of seeing what isn't yet visible; second, the frustration of knowing the warning will not be believed until it's already too late. Most Oracles fail not because they're wrong, but because they cannot translate their pattern into something a Hunter or Blade can act on.",
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
    signatureTraits: [
      "You move first and force the table to catch up.",
      "You burn the path behind you so retreat isn't an option.",
      "You win fast or lose fast; slow is your worst setting.",
    ],
    recommendations: [
      "Build a 48-hour waiting rule for moves that affect people who cannot protect themselves.",
      "Partner with one Architect who has veto power on irreversible decisions.",
      "Count your scars. Blades who survive learn when NOT to cut.",
    ],
    famousExamples: ["Napoleon", "Serena Williams", "Steve Jobs (early Apple)", "Arya Stark"],
    laws: [
      "Move first. Force the table to catch up.",
      "Speed is a tax on decisiveness, not a substitute for thinking.",
      "If the cut isn't decisive, don't make it.",
      "Build a 48-hour rule on irreversible moves that touch people who can't protect themselves.",
      "Half your scars are from cutting too soon. Count them and slow the next one.",
      "Pair with an Architect. Their patience is your missing brake.",
      "Your reputation for force is a pre-paid currency. Spend it carefully.",
    ],
    enemyTactics:
      "The Architect is your natural enemy because they win by waiting longer than you can. They will not engage on your timetable; they engineer the situation so your fastest move is also your most exposed. The Blade who fights an Architect on their terms always loses — because the Blade's terms are speed, and the Architect's terms are structure. Defeat the Architect by refusing the engagement they've designed for you. Walk away from set-piece battles. Strike where they have no plan. The Architect is dangerous in systems they've built. They are vulnerable in chaos they didn't predict.",
    archetypeDepth:
      "The Blade is wired for kinetic clarity. Your ventral striatum produces more dopamine in chaotic environments than stable ones — you literally feel better when stakes are high. Napoleon won 60 battles by moving before his enemies finished forming up. Serena Williams reshaped tennis by treating the next point as the only point. Early Steve Jobs forced a stagnant computing industry forward by burning processes faster than the market could replace them. The Blade's signature is anti-fragility under pressure. Your failure mode is the move you didn't need to make: scars accumulated by speed unchecked by selection. Blades who survive into their forties learn one skill — when not to cut.",
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
    signatureTraits: [
      "You hold multiple perspectives at once without losing your own.",
      "You win rooms by being the person everyone needs and no one fears.",
      "You treat agreement as a strategy, not a personality trait.",
    ],
    recommendations: [
      "Pick one alliance you are willing to break this year. The refusal to break one is your ceiling.",
      "Stop solving disagreements too fast. Sometimes the tension is the leverage.",
      "Practice being the one who names the hard thing first.",
    ],
    famousExamples: ["Angela Merkel", "Barack Obama", "Nelson Mandela", "Jon Snow"],
    laws: [
      "Pick one alliance per year you are willing to break. Refusing to pick is your ceiling.",
      "Hold tension instead of resolving it. Some disagreements are leverage, not problems.",
      "Speak first when the room is most afraid to. Diplomacy without courage is theatre.",
      "The relationships you protect at all costs become the cage you can't leave.",
      "Choose the long alliance over the short transaction every time.",
      "Be the only person in the room who can survive being disliked by both sides.",
      "Likeability without spine is a service. Add the spine.",
    ],
    enemyTactics:
      "The Flame is built to neutralise you because they convert rooms through magnetism faster than you can convert them through composure. Where you build alignment slowly, the Flame creates devotion in minutes. You cannot out-charm a Flame. You can, however, out-last them. Magnetism erodes; structure compounds. The Diplomat who waits, who keeps the room functioning when the Flame's heat fades, becomes the person the room turns to next. Do not contest the Flame's stage. Build the room they will eventually need to enter — and own the keys.",
    archetypeDepth:
      "The Diplomat is the most socially intelligent archetype — your temporoparietal junction shows co-activation patterns associated with advanced perspective-taking, meaning you can hold multiple frames simultaneously without losing your own. Angela Merkel led Germany through three crises by being the person every faction trusted to be reasonable. Barack Obama held a coalition together that contained ideological opposites. Nelson Mandela won South Africa's transition by refusing to make his enemies feel cornered. The Diplomat's strength is also their cage: alliance-addiction. Your oxytocin response to social bonding is genuine, but it makes the decisive move that costs you a relationship feel like physiological injury. The Diplomats who become great are the ones who learn to eat that injury.",
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
    signatureTraits: [
      "You spot leverage faster than anyone in the room.",
      "You sever attachments cleanly so speed stays cheap.",
      "You treat positions as stepping stones, never homes.",
    ],
    recommendations: [
      "Pick one long bet per decade and forbid yourself from exiting it early.",
      "Compound something — capital, reputation, relationships. Pick one.",
      "Anchor yourself to one person whose respect you will not burn for a deal.",
    ],
    famousExamples: ["Carl Icahn", "Travis Kalanick", "Han Solo", "Becky Sharp"],
    laws: [
      "Pick one long bet per decade and forbid yourself from exiting it.",
      "Compound something — capital, reputation, or relationships. Pick one.",
      "Anchor to one person whose respect you will never burn for a deal.",
      "Fast extraction without retained position is a job, not an empire.",
      "Loyalty you've earned is leverage you've paid for. Don't waste either.",
      "Treat the next move like it's your last — sometimes it should be.",
      "Speed buys options. Don't trade them all for the next move.",
    ],
    enemyTactics:
      "The Oracle is your natural enemy because they see the cost of your speed before you do. They cannot match your tempo, but they don't need to — they wait for the moment your momentum becomes a liability. The Hunter who learns to listen to one trusted Oracle dramatically extends their career. Most Hunters don't, and burn out. To neutralise an Oracle, the Hunter must do the one thing they hate: slow down long enough to test the prediction. Either the Oracle is right and you've saved a year, or they're wrong and you've lost a week. Either trade is good.",
    archetypeDepth:
      "The Hunter operates at velocity. Your ventromedial prefrontal cortex processes opportunity-value faster than other archetypes — you literally see leverage before others see noise. Carl Icahn built a fortune on activist trades others called impossible. Travis Kalanick scaled Uber by treating regulatory approval as a problem to outrun, not solve. Han Solo's whole arc is a Hunter being asked to develop loyalty to something larger than the next exit. The Hunter's shadow is the velocity trap: you exit positions just before they would have compounded, and then wonder why your peers — slower, less talented — somehow ended up with empires. The Hunter who survives is the one who picks one position they refuse to leave.",
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
    signatureTraits: [
      "You pull attention without trying. People move toward you.",
      "You confuse chemistry for alliance. They aren't the same.",
      "You are most dangerous when you are underestimated.",
    ],
    recommendations: [
      "Build one boring system — finance, calendar, exercise. Magnetism needs scaffolding.",
      "Pick three relationships to deepen. Stop collecting shallow ones.",
      "Learn to say no in rooms where the default answer is charm.",
    ],
    famousExamples: ["Cleopatra", "Muhammad Ali", "David Bowie", "Daisy Buchanan"],
    laws: [
      "Build one boring system. Magnetism without scaffolding goes silent.",
      "Pick three relationships to deepen. Stop collecting shallow ones.",
      "Learn to say the no that costs you a room.",
      "The audience you cultivate is also the cage you'll need to leave.",
      "Beauty as leverage decays. Pattern that beauty into something that doesn't.",
      "Underestimated is your most dangerous mode. Stay there longer than you think.",
      "Charm without cost loses its currency. Make people feel they earned your attention.",
    ],
    enemyTactics:
      "The Diplomat is built to neutralise you because they win rooms through composure when you win them through heat. They aren't trying to compete with your magnetism — they're patient enough to outlast it. The Flame's defence isn't more charm; it's structure. A Flame with one boring discipline (a calendar that holds, a financial habit that compounds, a relationship that pre-dates the audience) becomes immune to the slow erosion the Diplomat counts on. Without that structure, you remain dazzling and exhaustible. With it, you become the rare thing: a Flame that doesn't dim.",
    archetypeDepth:
      "The Flame's signature is referent power — magnetism that draws people without requiring command. Cleopatra wasn't the most beautiful woman in the ancient world, but Plutarch wrote that 'her presence struck the listener with astonishment.' Muhammad Ali turned boxing into theatre by being the most magnetic person in any room, fight or otherwise. David Bowie reinvented his audience every five years and they followed. Daisy Buchanan, Fitzgerald's masterpiece, made an entire generation of men ruin themselves chasing what they couldn't define. The Flame's failure mode is hedonic adaptation. Audiences need novelty, and novelty is the most expensive thing to manufacture. Flames who survive their thirties learn one thing — to convert pure magnetism into something that compounds when the room cools.",
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
