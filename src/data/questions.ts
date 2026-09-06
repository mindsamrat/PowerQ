import type { AxisScores } from "@/lib/scoring";

export type Axis = keyof AxisScores;

export type OptionId = "a" | "b" | "c" | "d";

export interface QuestionOption {
  id: OptionId;
  text: string;
  scores: Partial<AxisScores>;
}

export type QuestionKind = "calibration" | "branched" | "tiebreaker" | "free-text" | "email";

/**
 * Each question is grounded in a recognised psychology / behavioural
 * economics tradition. We expose this on the results page and the paid PDF
 * so users see the framework, not just a vibe.
 */
export interface FrameworkRef {
  /** Short name shown to users, e.g. "Self-Monitoring Scale". */
  name: string;
  /** Short citation, e.g. "Snyder, 1974". */
  citation: string;
  /** One-line plain-English explanation of what this framework probes. */
  probes: string;
}

export interface ChoiceQuestion {
  id: string;
  kind: Exclude<QuestionKind, "free-text" | "email">;
  prompt: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  /** All axes this question contributes points to. */
  probes?: Axis[];
  /** The dominant axis this question is designed to differentiate. */
  primaryAxis?: Axis;
  /** Which research tradition this question maps to. */
  framework?: FrameworkRef;
}

export interface FreeTextQuestion {
  id: string;
  kind: "free-text";
  prompt: string;
  maxLength: number;
  optional: true;
  usageNote: string;
}

export interface EmailQuestion {
  id: string;
  kind: "email";
  prompt: string;
  subPrompt: string;
  namePrompt: string;
  emailPrompt: string;
}

export type Question = ChoiceQuestion | FreeTextQuestion | EmailQuestion;

/**
 * Bump whenever question ids, option ids, or deltas change. In-progress
 * quizzes saved in localStorage under an older version are discarded so a
 * respondent is never scored against a bank their answers don't belong to.
 */
export const QUIZ_BANK_VERSION = 3;

/*
 * DELTA DESIGN
 * ------------
 * Scores are range-normalised per question (see lib/scoring.ts), so what
 * matters is the *relative* position of each option within its question,
 * not the absolute numbers. Every question offers four options that each
 * pull toward a different archetype, so the bank is balanced: across all
 * 27 questions each archetype is the "target" of 13–15 options.
 *
 * Direction templates (relative to a neutral 50):
 *   Sovereign  C+ V+ T+ P+     Shadow     C+ V-- T+ P+
 *   Architect  C+ V~ T++ P~    Oracle     C~ V~ T+ P--
 *   Blade      C+ V+ T-- P+    Diplomat   C~ V+ T+ P-
 *   Hunter     C~ V- T-- P~    Flame      C- V++ T~ P--
 */
const SOV = { control: 15, visibility: 15, timeHorizon: 10, powerSource: 10 };
const SHA = { control: 15, visibility: -15, timeHorizon: 15, powerSource: 15 };
const ARC = { control: 10, visibility: 5, timeHorizon: 20, powerSource: -5 };
const ORA = { control: -10, visibility: -5, timeHorizon: 15, powerSource: -20 };
const BLA = { control: 15, visibility: 15, timeHorizon: -20, powerSource: 15 };
const DIP = { control: 0, visibility: 15, timeHorizon: 15, powerSource: -15 };
const HUN = { control: 0, visibility: -15, timeHorizon: -20, powerSource: 0 };
const FLA = { control: -10, visibility: 20, timeHorizon: -10, powerSource: -20 };

export const questions: Question[] = [
  {
    id: "q01",
    kind: "calibration",
    prompt: "When you walk into a room full of strangers, your instinct is to:",
    probes: ["control", "visibility", "timeHorizon", "powerSource"],
    primaryAxis: "visibility",
    framework: {
      name: "Self-Monitoring Scale",
      citation: "Snyder, 1974",
      probes: "How much you adjust your behaviour to the room you're in.",
    },
    options: [
      { id: "a", text: "Become the center of attention within 10 minutes.", scores: { ...SOV, visibility: 20 } },
      { id: "b", text: "Identify the two most powerful people and position yourself near them.", scores: HUN },
      { id: "c", text: "Stay quiet, observe, and learn who matters before speaking.", scores: { ...ORA, visibility: -10 } },
      { id: "d", text: "Find the one person most worth talking to and go deep.", scores: DIP },
    ],
  },
  {
    id: "q02",
    kind: "calibration",
    prompt: "People tend to do what you want because:",
    probes: ["powerSource", "control", "timeHorizon", "visibility"],
    primaryAxis: "powerSource",
    framework: {
      name: "Bases of Social Power",
      citation: "French & Raven, 1959",
      probes: "Whether you wield coercive, expert, or referent power.",
    },
    options: [
      { id: "a", text: "They don't want to find out what happens if they don't.", scores: { ...BLA, powerSource: 20 } },
      { id: "b", text: "They trust your judgment more than their own on the matter.", scores: ORA },
      { id: "c", text: "They find something about you compelling they can't quite name.", scores: FLA },
      { id: "d", text: "You've structured the situation so your path is theirs too.", scores: SOV },
    ],
  },
  {
    id: "q03",
    kind: "calibration",
    prompt: "Your ideal public recognition looks like:",
    probes: ["visibility", "powerSource", "timeHorizon", "control"],
    primaryAxis: "visibility",
    framework: {
      name: "Public Self-Consciousness",
      citation: "Fenigstein, Scheier & Buss, 1975",
      probes: "How much you orient toward an external audience.",
    },
    options: [
      { id: "a", text: "Your name known in rooms you've never entered.", scores: { ...SOV, visibility: 20 } },
      { id: "b", text: "Quiet respect from the people whose opinions actually matter.", scores: ORA },
      { id: "c", text: "No one knowing your role in outcomes you shaped.", scores: { ...SHA, visibility: -20 } },
      { id: "d", text: "People feeling pulled toward you without knowing why.", scores: FLA },
    ],
  },
  {
    id: "q04",
    kind: "calibration",
    prompt: "You learn someone is quietly working against you. Your move:",
    probes: ["timeHorizon", "powerSource", "visibility", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Temporal Discounting",
      citation: "Loewenstein & Prelec, 1992",
      probes: "How heavily you weight an immediate move vs a delayed one.",
    },
    options: [
      { id: "a", text: "Confront them immediately and end it in one conversation.", scores: BLA },
      { id: "b", text: "Start building the trap and let them walk into it over months.", scores: { ...SHA, timeHorizon: 20 } },
      { id: "c", text: "Remove the resources they need to hurt you before they know you know.", scores: ARC },
      { id: "d", text: "Make them like you so much they abandon the effort on their own.", scores: FLA },
    ],
  },
  {
    id: "q05",
    kind: "calibration",
    prompt: "Pick the statement most true about you:",
    probes: ["powerSource", "visibility", "timeHorizon", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Need for Power",
      citation: "McClelland, 1975",
      probes: "Your underlying motive: visibility, control, or quiet impact.",
    },
    options: [
      { id: "a", text: "I would rather be feared than liked, if I had to choose.", scores: { ...BLA, powerSource: 20 } },
      { id: "b", text: "I would rather be influential than famous.", scores: ARC },
      { id: "c", text: "I would rather win quietly than lose loudly.", scores: ORA },
      { id: "d", text: "I would rather be admired than powerful.", scores: FLA },
    ],
  },
  {
    id: "q06",
    kind: "branched",
    prompt: "You're given a team of ten people. You immediately want to:",
    probes: ["control", "timeHorizon", "powerSource", "visibility"],
    primaryAxis: "control",
    framework: {
      name: "Power Distance Orientation",
      citation: "Hofstede, 1980",
      probes: "How comfortable you are with explicit hierarchy and command.",
    },
    options: [
      { id: "a", text: "Set clear rules, hierarchies, and consequences.", scores: { ...SOV, control: 20 } },
      { id: "b", text: "Identify the top two and make everyone else work through them.", scores: ARC },
      { id: "c", text: "Let them self-organize and watch who rises.", scores: { ...ORA, control: -10 } },
      { id: "d", text: "Become the person they come to with problems.", scores: DIP },
    ],
  },
  {
    id: "q06b",
    kind: "branched",
    prompt: "You're the most capable person in the room and nobody is treating you that way. You:",
    probes: ["control", "visibility", "timeHorizon", "powerSource"],
    primaryAxis: "visibility",
    framework: {
      name: "Expectation States Theory",
      citation: "Berger, Cohen & Zelditch, 1972",
      probes: "How you respond when a group's status ranking doesn't match your actual competence.",
    },
    options: [
      { id: "a", text: "Take over the next decision openly and let the results speak.", scores: SOV },
      { id: "b", text: "Make yourself quietly indispensable until they can't route around you.", scores: SHA },
      { id: "c", text: "Leave. A room that can't see you isn't worth fixing.", scores: HUN },
      { id: "d", text: "Win them over one at a time until the room reorganises around you.", scores: FLA },
    ],
  },
  {
    id: "q06c",
    kind: "branched",
    prompt: "Someone talks down to you in front of people whose opinion matters. In the moment, you:",
    probes: ["control", "visibility", "powerSource", "timeHorizon"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Dominance Contest",
      citation: "Mazur, 1985",
      probes: "Whether you answer a status challenge in public, in private, or by withdrawing access.",
    },
    options: [
      { id: "a", text: "Correct them right there, calmly, so everyone sees the line.", scores: SOV },
      { id: "b", text: "Say nothing now. Handle it privately, where it actually costs them.", scores: SHA },
      { id: "c", text: "Laugh it off — and never give them access again.", scores: DIP },
      { id: "d", text: "Match them. If they want a scene, they get a scene.", scores: BLA },
    ],
  },
  {
    id: "q06d",
    kind: "branched",
    prompt: "A peer with half your ability keeps getting the opportunities. You:",
    probes: ["control", "timeHorizon", "visibility", "powerSource"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Relative Deprivation",
      citation: "Runciman, 1966",
      probes: "How you act on a perceived unfair gap between your ability and your rewards.",
    },
    options: [
      { id: "a", text: "Go over the decision-maker's head and make the case yourself.", scores: BLA },
      { id: "b", text: "Study exactly why they're winning and copy the mechanism, not the person.", scores: HUN },
      { id: "c", text: "Build something they can't compete with and let the gap become obvious.", scores: ARC },
      { id: "d", text: "Get close to them. Their access becomes your access.", scores: DIP },
    ],
  },
  {
    id: "q07",
    kind: "branched",
    prompt: "Decades from now, you want to be remembered as:",
    probes: ["timeHorizon", "visibility", "control", "powerSource"],
    primaryAxis: "visibility",
    framework: {
      name: "Generativity",
      citation: "Erikson, 1950",
      probes: "How far past your own lifetime your ambition reaches.",
    },
    options: [
      { id: "a", text: "Someone who built something that still stands.", scores: ARC },
      { id: "b", text: "Someone whose decisions changed the trajectory of others' lives.", scores: SOV },
      { id: "c", text: "Someone no one ever fully figured out.", scores: SHA },
      { id: "d", text: "Someone people still feel the pull of, even now.", scores: FLA },
    ],
  },
  {
    id: "q08",
    kind: "branched",
    prompt: "In a negotiation where you hold the weaker hand, you:",
    probes: ["powerSource", "timeHorizon", "control", "visibility"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Prospect Theory",
      citation: "Kahneman & Tversky, 1979",
      probes: "How loss-averse you are when stakes are real.",
    },
    options: [
      { id: "a", text: "Bluff hard and commit like you hold the stronger one.", scores: BLA },
      { id: "b", text: "Find what they actually want that isn't on the table and offer that.", scores: DIP },
      { id: "c", text: "Walk away and make them come back to you.", scores: HUN },
      { id: "d", text: "Ally with someone who holds the strong hand against them.", scores: ARC },
    ],
  },
  {
    id: "q09",
    kind: "branched",
    prompt: "Someone you trusted betrays you publicly. You:",
    probes: ["powerSource", "timeHorizon", "visibility", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Reactive vs Proactive Aggression",
      citation: "Dodge & Coie, 1987",
      probes: "Whether you respond to threat in heat or in cold.",
    },
    options: [
      { id: "a", text: "Destroy their reputation openly and quickly.", scores: { ...BLA, powerSource: 20 } },
      { id: "b", text: "Say nothing. Quietly remove them from every room they want to enter.", scores: SHA },
      { id: "c", text: "Forgive them publicly and keep them close for leverage later.", scores: SOV },
      { id: "d", text: "Walk away and never mention them again. Move up.", scores: HUN },
    ],
  },
  {
    id: "q10",
    kind: "branched",
    prompt: "You did the work but someone else is getting the credit. You:",
    probes: ["timeHorizon", "visibility", "powerSource", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Status Signaling",
      citation: "Anderson & Kennedy, 2012",
      probes: "How important credit and recognition are to you.",
    },
    options: [
      { id: "a", text: "Confront them directly and demand correction.", scores: BLA },
      { id: "b", text: "Document everything quietly so the truth emerges naturally.", scores: ORA },
      { id: "c", text: "Let it go this time and engineer the next situation so it can't happen.", scores: ARC },
      { id: "d", text: "Use their inflated credit against them when they fail at the next level.", scores: SHA },
    ],
  },
  {
    id: "q11",
    kind: "branched",
    prompt: "A rare opportunity surfaces that requires acting within 48 hours. You:",
    probes: ["timeHorizon", "powerSource", "visibility", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Consideration of Future Consequences",
      citation: "Strathman et al., 1994",
      probes: "Tactical-now vs strategic-later under time pressure.",
    },
    options: [
      { id: "a", text: "Move. If you wait to be sure, it's gone.", scores: HUN },
      { id: "b", text: "Take a small position tonight and scale if it works.", scores: DIP },
      { id: "c", text: "Pass. Real power moves don't come with 48-hour timers.", scores: { ...ORA, timeHorizon: 20 } },
      { id: "d", text: "Get someone else to take the risk first, move second.", scores: SHA },
    ],
  },
  {
    id: "q12",
    kind: "branched",
    prompt: "You lead a team through a crisis by:",
    probes: ["control", "powerSource", "visibility", "timeHorizon"],
    primaryAxis: "control",
    framework: {
      name: "Personal Need for Structure",
      citation: "Neuberg & Newsom, 1993",
      probes: "How much you reach for explicit order under pressure.",
    },
    options: [
      { id: "a", text: "Giving one clear order and absorbing all blame if wrong.", scores: { ...SOV, control: 20 } },
      { id: "b", text: "Staying silent while the structure you built runs.", scores: ARC },
      { id: "c", text: "Modeling calm so the team borrows your composure.", scores: DIP },
      { id: "d", text: "Reading each person and calibrating what they need to hear.", scores: ORA },
    ],
  },
  {
    id: "q13",
    kind: "branched",
    prompt: "Your preferred relationship with money is:",
    probes: ["visibility", "timeHorizon", "control", "powerSource"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Delayed Gratification",
      citation: "Mischel, 1972",
      probes: "Whether you optimise for now or for compounding.",
    },
    options: [
      { id: "a", text: "Visible. People should know what you've built.", scores: SOV },
      { id: "b", text: "Liquid. You want the option to move tomorrow.", scores: HUN },
      { id: "c", text: "Structural. It compounds while you sleep.", scores: ARC },
      { id: "d", text: "Leveraged. You want to own what others need.", scores: SHA },
    ],
  },
  {
    id: "q14",
    kind: "branched",
    prompt: "Someone tells you a rumor about a mutual associate. You:",
    probes: ["timeHorizon", "visibility", "powerSource", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Information Asymmetry",
      citation: "Akerlof, 1970",
      probes: "How you treat private information as power.",
    },
    options: [
      { id: "a", text: "Act on it if useful, even if it's only 60% likely to be true.", scores: HUN },
      { id: "b", text: "Verify quietly through two other sources before deciding.", scores: ORA },
      { id: "c", text: "Trade it as a favor to someone who can use it now.", scores: DIP },
      { id: "d", text: "File it. Information compounds when you don't burn it.", scores: SHA },
    ],
  },
  {
    id: "q15",
    kind: "branched",
    prompt: "When you want someone romantically, your approach is to:",
    probes: ["visibility", "powerSource", "timeHorizon", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Approach Motivation",
      citation: "Gable, 2006",
      probes: "Push (pursuit) versus pull (attraction) in intimate dynamics.",
    },
    options: [
      { id: "a", text: "Make your interest unmistakable and let them decide.", scores: SOV },
      { id: "b", text: "Become impossible for them to stop thinking about.", scores: FLA },
      { id: "c", text: "Make yourself the most valuable option in their life and wait.", scores: ARC },
      { id: "d", text: "Move on if they don't notice quickly. You're not a project.", scores: HUN },
    ],
  },
  {
    id: "q16",
    kind: "branched",
    prompt: "You make a public mistake and lose face. You:",
    probes: ["visibility", "timeHorizon", "powerSource", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Impression Management",
      citation: "Goffman, 1959",
      probes: "How you repair or re-frame a damaged public self.",
    },
    options: [
      { id: "a", text: "Own it immediately, loudly, and re-frame it as a lesson.", scores: BLA },
      { id: "b", text: "Disappear for six months and return unrecognizably stronger.", scores: ARC },
      { id: "c", text: "Make it the first line of your next big story.", scores: FLA },
      { id: "d", text: "Find who benefited from your fall and plan the response.", scores: SHA },
    ],
  },
  {
    id: "q17",
    kind: "branched",
    prompt: "You can pick one ally for the next decade. You pick the one who is:",
    probes: ["timeHorizon", "visibility", "powerSource", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Strong vs Weak Ties",
      citation: "Granovetter, 1973",
      probes: "Which kind of relationship you treat as power infrastructure.",
    },
    options: [
      { id: "a", text: "Deeply loyal but not especially useful.", scores: FLA },
      { id: "b", text: "Brilliant but transactional.", scores: HUN },
      { id: "c", text: "Invisible, patient, and quietly competent.", scores: ORA },
      { id: "d", text: "The best in the world at something you can't do.", scores: ARC },
    ],
  },
  {
    id: "q18",
    kind: "branched",
    prompt: "When you need someone to change their mind, you usually:",
    probes: ["powerSource", "control", "timeHorizon", "visibility"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Compliance vs Identification",
      citation: "Kelman, 1958",
      probes: "Whether your influence relies on pressure, reframing, or pull.",
    },
    options: [
      { id: "a", text: "Show them the cost of staying where they are.", scores: BLA },
      { id: "b", text: "Spend the time to get close enough that they want to listen.", scores: FLA },
      { id: "c", text: "Re-frame the question so their old position no longer applies.", scores: ORA },
      { id: "d", text: "Wait for the world to do the convincing for you.", scores: DIP },
    ],
  },
  {
    id: "q19",
    kind: "branched",
    prompt: "When something goes wrong in your life, your first thought is usually:",
    probes: ["control", "timeHorizon", "powerSource", "visibility"],
    primaryAxis: "powerSource",
    framework: {
      name: "Locus of Control",
      citation: "Rotter, 1966",
      probes: "Whether you treat outcomes as your fault, the system's, or someone else's.",
    },
    options: [
      { id: "a", text: "What did I miss that I should have seen sooner?", scores: ORA },
      { id: "b", text: "What system or rule failed, and how do I rebuild it?", scores: ARC },
      { id: "c", text: "Who has the authority to fix this, and how do I reach them?", scores: DIP },
      { id: "d", text: "Who benefits from this happening to me?", scores: SHA },
    ],
  },
  {
    id: "q20",
    kind: "branched",
    prompt: "Your real edge comes from:",
    probes: ["control", "powerSource", "timeHorizon", "visibility"],
    primaryAxis: "visibility",
    framework: {
      name: "Bases of Social Power (self-attributed)",
      citation: "French & Raven, 1959",
      probes: "Which of the five power bases you most identify with.",
    },
    options: [
      { id: "a", text: "The people who owe you favors and would take your call tonight.", scores: DIP },
      { id: "b", text: "Something about how you think that others simply don't share.", scores: ORA },
      { id: "c", text: "Your presence. People want to be near you and don't fully know why.", scores: FLA },
      { id: "d", text: "Your appetite for risk that others would call reckless.", scores: HUN },
    ],
  },
  {
    id: "q20b",
    kind: "branched",
    prompt: "When you see a problem others have missed, you usually:",
    probes: ["powerSource", "timeHorizon", "visibility", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Pattern Recognition Under Uncertainty",
      citation: "Klein, 1998",
      probes: "How you convert insight into action — fast, slow, or stored.",
    },
    options: [
      { id: "a", text: "Say so publicly and quickly, before someone else claims it.", scores: BLA },
      { id: "b", text: "Explain it slowly to one person who can actually act on it.", scores: DIP },
      { id: "c", text: "Keep it to yourself until the moment you need leverage.", scores: SHA },
      { id: "d", text: "Use it to make your next move without explaining anything.", scores: HUN },
    ],
  },
  {
    id: "q21",
    kind: "tiebreaker",
    prompt: "If no one ever knew what you achieved, would you still do it?",
    probes: ["visibility", "timeHorizon", "powerSource", "control"],
    primaryAxis: "visibility",
    framework: {
      name: "Intrinsic vs Extrinsic Motivation",
      citation: "Deci & Ryan, 1985",
      probes: "Whether recognition is the goal or a side effect.",
    },
    options: [
      { id: "a", text: "No. Power without witness is just effort.", scores: FLA },
      { id: "b", text: "Yes, but I'd build differently.", scores: ARC },
      { id: "c", text: "Yes, completely. Recognition is a side effect, not the point.", scores: { ...SHA, visibility: -20 } },
      { id: "d", text: "Depends on the move. Some are public, some aren't.", scores: SOV },
    ],
  },
  {
    id: "q22",
    kind: "tiebreaker",
    prompt: "You get what you want most often by:",
    probes: ["powerSource", "control", "timeHorizon", "visibility"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Influence Mechanisms",
      citation: "Cialdini, 1984",
      probes: "Whether your influence runs on fear, charm, structure, or framing.",
    },
    options: [
      { id: "a", text: "Making people afraid of the alternative.", scores: { ...BLA, powerSource: 20 } },
      { id: "b", text: "Making people want to please you.", scores: FLA },
      { id: "c", text: "Making the situation so tilted the answer is obvious.", scores: ARC },
      { id: "d", text: "Making them believe it was their idea.", scores: DIP },
    ],
  },
  {
    id: "q23",
    kind: "tiebreaker",
    prompt: "Your most satisfying wins usually:",
    probes: ["timeHorizon", "powerSource", "visibility", "control"],
    primaryAxis: "timeHorizon",
    framework: {
      name: "Time Preference",
      citation: "Frederick, Loewenstein & O'Donoghue, 2002",
      probes: "Whether you derive satisfaction from speed or from compounding.",
    },
    options: [
      { id: "a", text: "Come in a single moment, cleanly.", scores: BLA },
      { id: "b", text: "Take years, and few people see the full chain.", scores: { ...SHA, timeHorizon: 20 } },
      { id: "c", text: "Build slowly in public, then lock in all at once.", scores: { ...SOV, timeHorizon: 15 } },
      { id: "d", text: "Come from moving faster than everyone else.", scores: HUN },
    ],
  },
  {
    id: "q24",
    kind: "free-text",
    prompt: "In 1-2 sentences, describe a time you got what you wanted by doing the opposite of what was expected.",
    maxLength: 280,
    optional: true,
    usageNote: "Used to personalize the opening paragraph of your PDF report. Skipping reduces personalization.",
  },
  {
    id: "q25",
    kind: "free-text",
    prompt: "When was the last time you held back from saying what you actually thought? What stopped you?",
    maxLength: 280,
    optional: true,
    usageNote: "Used to frame your 'hidden edge' section in the PDF report. Skipping reduces personalization.",
  },
  {
    id: "q_email",
    kind: "email",
    prompt: "Almost there. Tell us who this report belongs to.",
    subPrompt: "Your name appears on the cover and in the analysis. Disposable / temporary email addresses are blocked.",
    namePrompt: "Your first name",
    emailPrompt: "Your email",
  },
];

export const choiceQuestions = questions.filter(
  (q): q is ChoiceQuestion => q.kind !== "free-text" && q.kind !== "email"
);

export const freeTextQuestions = questions.filter(
  (q): q is FreeTextQuestion => q.kind === "free-text"
);

export const emailQuestion = questions.find(
  (q): q is EmailQuestion => q.kind === "email"
);
