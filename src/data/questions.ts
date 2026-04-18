import type { AxisScores } from "@/lib/scoring";

export type Axis = keyof AxisScores;

export type OptionId = "a" | "b" | "c" | "d";

export interface QuestionOption {
  id: OptionId;
  text: string;
  scores: Partial<AxisScores>;
}

export type QuestionKind = "calibration" | "branched" | "tiebreaker" | "free-text";

export interface ChoiceQuestion {
  id: string;
  kind: Exclude<QuestionKind, "free-text">;
  prompt: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  probes?: Axis[];
}

export interface FreeTextQuestion {
  id: string;
  kind: "free-text";
  prompt: string;
  maxLength: number;
  optional: true;
  usageNote: string;
}

export type Question = ChoiceQuestion | FreeTextQuestion;

export const questions: Question[] = [
  {
    id: "q01",
    kind: "calibration",
    prompt: "When you walk into a room full of strangers, your instinct is to:",
    probes: ["control", "visibility"],
    options: [
      { id: "a", text: "Become the center of attention within 10 minutes.", scores: { control: 15, visibility: 15, powerSource: 5 } },
      { id: "b", text: "Identify the two most powerful people and position yourself near them.", scores: { control: 5, visibility: -10, timeHorizon: 10, powerSource: 5 } },
      { id: "c", text: "Stay quiet, observe, and learn who matters before speaking.", scores: { control: -5, visibility: -15, timeHorizon: 15, powerSource: -10 } },
      { id: "d", text: "Find the one person most worth talking to and go deep.", scores: { visibility: -5, timeHorizon: 5, powerSource: -15 } },
    ],
  },
  {
    id: "q02",
    kind: "calibration",
    prompt: "People tend to do what you want because:",
    probes: ["powerSource", "control"],
    options: [
      { id: "a", text: "They don't want to find out what happens if they don't.", scores: { control: 15, powerSource: 20 } },
      { id: "b", text: "They trust your judgment more than their own on the matter.", scores: { control: 10, timeHorizon: 10, powerSource: -10 } },
      { id: "c", text: "They find something about you compelling they can't quite name.", scores: { visibility: 10, powerSource: -20 } },
      { id: "d", text: "You've structured the situation so your path is theirs too.", scores: { control: 15, timeHorizon: 15, powerSource: 5 } },
    ],
  },
  {
    id: "q03",
    kind: "calibration",
    prompt: "Your ideal public recognition looks like:",
    probes: ["visibility"],
    options: [
      { id: "a", text: "Your name known in rooms you've never entered.", scores: { control: 10, visibility: 20 } },
      { id: "b", text: "Quiet respect from the people whose opinions actually matter.", scores: { visibility: -15, powerSource: -10 } },
      { id: "c", text: "No one knowing your role in outcomes you shaped.", scores: { visibility: -20, timeHorizon: 15, powerSource: 10 } },
      { id: "d", text: "People feeling pulled toward you without knowing why.", scores: { visibility: 10, powerSource: -15 } },
    ],
  },
  {
    id: "q04",
    kind: "calibration",
    prompt: "You learn someone is quietly working against you. Your move:",
    probes: ["timeHorizon", "powerSource"],
    options: [
      { id: "a", text: "Confront them immediately and end it in one conversation.", scores: { visibility: 10, timeHorizon: -15, powerSource: 15 } },
      { id: "b", text: "Start building the trap and let them walk into it over months.", scores: { control: 10, timeHorizon: 20, powerSource: 10 } },
      { id: "c", text: "Remove the resources they need to hurt you before they know you know.", scores: { control: 15, visibility: -15, timeHorizon: 10 } },
      { id: "d", text: "Make them like you so much they abandon the effort on their own.", scores: { control: 5, powerSource: -20 } },
    ],
  },
  {
    id: "q05",
    kind: "calibration",
    prompt: "Pick the statement most true about you:",
    probes: ["powerSource", "visibility"],
    options: [
      { id: "a", text: "I would rather be feared than liked, if I had to choose.", scores: { control: 10, powerSource: 15 } },
      { id: "b", text: "I would rather be influential than famous.", scores: { visibility: -10, timeHorizon: 10, powerSource: -5 } },
      { id: "c", text: "I would rather win quietly than lose loudly.", scores: { control: 5, visibility: -5, timeHorizon: 10 } },
      { id: "d", text: "I would rather be admired than powerful.", scores: { control: -10, visibility: 10, powerSource: -15 } },
    ],
  },
  {
    id: "q06",
    kind: "branched",
    prompt: "You're given a team of ten people. You immediately want to:",
    probes: ["control"],
    options: [
      { id: "a", text: "Set clear rules, hierarchies, and consequences.", scores: { control: 15, powerSource: 10 } },
      { id: "b", text: "Identify the top two and make everyone else work through them.", scores: { control: 10, visibility: -5, timeHorizon: 10 } },
      { id: "c", text: "Let them self-organize and watch who rises.", scores: { control: -10, timeHorizon: 15, powerSource: -5 } },
      { id: "d", text: "Become the person they come to with problems.", scores: { control: 5, visibility: 5, powerSource: -15 } },
    ],
  },
  {
    id: "q07",
    kind: "branched",
    prompt: "Decades from now, you want to be remembered as:",
    probes: ["timeHorizon", "visibility"],
    options: [
      { id: "a", text: "Someone who built something that still stands.", scores: { control: 10, timeHorizon: 20 } },
      { id: "b", text: "Someone whose decisions changed the trajectory of others' lives.", scores: { control: 10, visibility: -10, timeHorizon: 15 } },
      { id: "c", text: "Someone no one ever fully figured out.", scores: { visibility: -20, timeHorizon: 10, powerSource: -10 } },
      { id: "d", text: "Someone people still feel the pull of, even now.", scores: { visibility: 15, powerSource: -20 } },
    ],
  },
  {
    id: "q08",
    kind: "branched",
    prompt: "In a negotiation where you hold the weaker hand, you:",
    probes: ["powerSource", "timeHorizon"],
    options: [
      { id: "a", text: "Bluff hard and commit like you hold the stronger one.", scores: { timeHorizon: -10, powerSource: 15 } },
      { id: "b", text: "Find what they actually want that isn't on the table and offer that.", scores: { control: 10, timeHorizon: 10, powerSource: -15 } },
      { id: "c", text: "Walk away and make them come back to you.", scores: { visibility: -5, timeHorizon: 15, powerSource: 10 } },
      { id: "d", text: "Ally with someone who holds the strong hand against them.", scores: { control: 15, visibility: -5, timeHorizon: 10 } },
    ],
  },
  {
    id: "q09",
    kind: "branched",
    prompt: "Someone you trusted betrays you publicly. You:",
    probes: ["powerSource", "timeHorizon", "visibility"],
    options: [
      { id: "a", text: "Destroy their reputation openly and quickly.", scores: { visibility: 15, timeHorizon: -15, powerSource: 20 } },
      { id: "b", text: "Say nothing. Quietly remove them from every room they want to enter.", scores: { visibility: -15, timeHorizon: 20, powerSource: 15 } },
      { id: "c", text: "Forgive them publicly and keep them close for leverage later.", scores: { control: 20, timeHorizon: 15, powerSource: -5 } },
      { id: "d", text: "Walk away and never mention them again. Move up.", scores: { control: 5, visibility: -10, timeHorizon: 15 } },
    ],
  },
  {
    id: "q10",
    kind: "branched",
    prompt: "You did the work but someone else is getting the credit. You:",
    probes: ["timeHorizon", "visibility"],
    options: [
      { id: "a", text: "Confront them directly and demand correction.", scores: { visibility: 15, timeHorizon: -15, powerSource: 15 } },
      { id: "b", text: "Document everything quietly so the truth emerges naturally.", scores: { control: 5, visibility: -10, timeHorizon: 20 } },
      { id: "c", text: "Let it go this time and engineer the next situation so it can't happen.", scores: { control: 15, timeHorizon: 15, powerSource: 5 } },
      { id: "d", text: "Use their inflated credit against them when they fail at the next level.", scores: { control: 10, timeHorizon: 20, powerSource: 15 } },
    ],
  },
  {
    id: "q11",
    kind: "branched",
    prompt: "A rare opportunity surfaces that requires acting within 48 hours. You:",
    probes: ["timeHorizon"],
    options: [
      { id: "a", text: "Move. If you wait to be sure, it's gone.", scores: { timeHorizon: -15, powerSource: 10 } },
      { id: "b", text: "Take a small position tonight and scale if it works.", scores: { timeHorizon: 5, powerSource: -5 } },
      { id: "c", text: "Pass. Real power moves don't come with 48-hour timers.", scores: { visibility: -10, timeHorizon: 20 } },
      { id: "d", text: "Get someone else to take the risk first, move second.", scores: { control: 15, visibility: -10, timeHorizon: 10 } },
    ],
  },
  {
    id: "q12",
    kind: "branched",
    prompt: "You lead a team through a crisis by:",
    probes: ["control", "powerSource"],
    options: [
      { id: "a", text: "Giving one clear order and absorbing all blame if wrong.", scores: { control: 20, visibility: 15, powerSource: 10 } },
      { id: "b", text: "Staying silent while the structure you built runs.", scores: { control: 10, visibility: -15, timeHorizon: 15 } },
      { id: "c", text: "Modeling calm so the team borrows your composure.", scores: { control: 5, visibility: 5, powerSource: -15 } },
      { id: "d", text: "Reading each person and calibrating what they need to hear.", scores: { control: 10, timeHorizon: 10, powerSource: -5 } },
    ],
  },
  {
    id: "q13",
    kind: "branched",
    prompt: "Your preferred relationship with money is:",
    probes: ["visibility", "timeHorizon"],
    options: [
      { id: "a", text: "Visible. People should know what you've built.", scores: { control: 10, visibility: 20 } },
      { id: "b", text: "Liquid. You want the option to move tomorrow.", scores: { timeHorizon: -15, powerSource: 5 } },
      { id: "c", text: "Structural. It compounds while you sleep.", scores: { control: 10, timeHorizon: 20 } },
      { id: "d", text: "Leveraged. You want to own what others need.", scores: { control: 15, visibility: -5, powerSource: 15 } },
    ],
  },
  {
    id: "q14",
    kind: "branched",
    prompt: "Someone tells you a rumor about a mutual associate. You:",
    probes: ["timeHorizon"],
    options: [
      { id: "a", text: "Act on it if useful, even if it's only 60% likely to be true.", scores: { timeHorizon: -10, powerSource: 10 } },
      { id: "b", text: "Verify quietly through two other sources before deciding.", scores: { control: 10, visibility: -10, timeHorizon: 15 } },
      { id: "c", text: "Trade it as a favor to someone who can use it now.", scores: { control: 10, visibility: 10 } },
      { id: "d", text: "File it. Information compounds when you don't burn it.", scores: { visibility: -15, timeHorizon: 20, powerSource: 10 } },
    ],
  },
  {
    id: "q15",
    kind: "branched",
    prompt: "When you want someone romantically, your approach is to:",
    probes: ["visibility", "powerSource"],
    options: [
      { id: "a", text: "Make your interest unmistakable and let them decide.", scores: { visibility: 15, powerSource: 5 } },
      { id: "b", text: "Become impossible for them to stop thinking about.", scores: { visibility: 10, powerSource: -20 } },
      { id: "c", text: "Make yourself the most valuable option in their life and wait.", scores: { control: 10, timeHorizon: 15, powerSource: -5 } },
      { id: "d", text: "Move on if they don't notice quickly. You're not a project.", scores: { timeHorizon: -15, powerSource: 5 } },
    ],
  },
  {
    id: "q16",
    kind: "branched",
    prompt: "You make a public mistake and lose face. You:",
    probes: ["visibility", "timeHorizon"],
    options: [
      { id: "a", text: "Own it immediately, loudly, and re-frame it as a lesson.", scores: { control: 10, visibility: 15 } },
      { id: "b", text: "Disappear for six months and return unrecognizably stronger.", scores: { visibility: -15, timeHorizon: 20 } },
      { id: "c", text: "Make it the first line of your next big story.", scores: { visibility: 10, powerSource: -15 } },
      { id: "d", text: "Find who benefited from your fall and plan the response.", scores: { visibility: -10, timeHorizon: 15, powerSource: 15 } },
    ],
  },
  {
    id: "q17",
    kind: "branched",
    prompt: "You can pick one ally for the next decade. You pick the one who is:",
    probes: ["timeHorizon", "visibility"],
    options: [
      { id: "a", text: "Deeply loyal but not especially useful.", scores: { control: -5, powerSource: -10 } },
      { id: "b", text: "Brilliant but transactional.", scores: { timeHorizon: -5, powerSource: 10 } },
      { id: "c", text: "Invisible, patient, and quietly competent.", scores: { control: 10, visibility: -20, timeHorizon: 15 } },
      { id: "d", text: "The best in the world at something you can't do.", scores: { control: 10, timeHorizon: 15 } },
    ],
  },
  {
    id: "q18",
    kind: "branched",
    prompt: "In a crowd, you are usually:",
    probes: ["visibility"],
    options: [
      { id: "a", text: "The voice people turn toward when something goes wrong.", scores: { control: 15, visibility: 15, powerSource: 5 } },
      { id: "b", text: "The one nobody notices until they do.", scores: { visibility: 5, powerSource: -20 } },
      { id: "c", text: "Outside the crowd, watching patterns others miss.", scores: { control: 5, visibility: -15, timeHorizon: 20 } },
      { id: "d", text: "In motion. Crowds are transitions, not destinations.", scores: { timeHorizon: -15, powerSource: 5 } },
    ],
  },
  {
    id: "q19",
    kind: "branched",
    prompt: "A mentor or boss is holding you back. You:",
    probes: ["timeHorizon", "powerSource"],
    options: [
      { id: "a", text: "Confront them once, directly, and ask for what you need.", scores: { visibility: 15, timeHorizon: -10, powerSource: 10 } },
      { id: "b", text: "Build your next move in silence until you can leave on your terms.", scores: { control: 10, visibility: -15, timeHorizon: 20 } },
      { id: "c", text: "Make yourself so essential they promote you to protect themselves.", scores: { control: 15, timeHorizon: 15, powerSource: -5 } },
      { id: "d", text: "Get recognized elsewhere until they have to adapt.", scores: { visibility: 20, powerSource: -10 } },
    ],
  },
  {
    id: "q20",
    kind: "branched",
    prompt: "Your real edge comes from:",
    probes: ["control", "powerSource", "timeHorizon"],
    options: [
      { id: "a", text: "The people who owe you favors and would take your call tonight.", scores: { control: 15, visibility: -5, timeHorizon: 15 } },
      { id: "b", text: "Something about how you think that others simply don't share.", scores: { control: 5, visibility: -5, timeHorizon: 15, powerSource: -5 } },
      { id: "c", text: "Your presence. People want to be near you and don't fully know why.", scores: { visibility: 15, powerSource: -20 } },
      { id: "d", text: "Your appetite for risk that others would call reckless.", scores: { timeHorizon: -15, powerSource: 15 } },
    ],
  },
  {
    id: "q20b",
    kind: "branched",
    prompt: "When you see a problem others have missed, you usually:",
    probes: ["powerSource", "timeHorizon", "visibility"],
    options: [
      { id: "a", text: "Say so publicly and quickly, before someone else claims it.", scores: { visibility: 15, timeHorizon: -10, powerSource: 5 } },
      { id: "b", text: "Explain it slowly to one person who can actually act on it.", scores: { visibility: 5, timeHorizon: 15, powerSource: -10 } },
      { id: "c", text: "Keep it to yourself until the moment you need leverage.", scores: { control: 5, visibility: -15, timeHorizon: 20, powerSource: 10 } },
      { id: "d", text: "Use it to make your next move without explaining anything.", scores: { timeHorizon: -5, powerSource: 10 } },
    ],
  },
  {
    id: "q21",
    kind: "tiebreaker",
    prompt: "If no one ever knew what you achieved, would you still do it?",
    probes: ["visibility"],
    options: [
      { id: "a", text: "No. Power without witness is just effort.", scores: { visibility: 20, powerSource: -5 } },
      { id: "b", text: "Yes, but I'd build differently.", scores: { visibility: -15, timeHorizon: 10 } },
      { id: "c", text: "Yes, completely. Recognition is a side effect, not the point.", scores: { control: 5, visibility: -20, timeHorizon: 15 } },
      { id: "d", text: "Depends on the move. Some are public, some aren't.", scores: { control: 5 } },
    ],
  },
  {
    id: "q22",
    kind: "tiebreaker",
    prompt: "You get what you want most often by:",
    probes: ["powerSource"],
    options: [
      { id: "a", text: "Making people afraid of the alternative.", scores: { control: 10, powerSource: 20 } },
      { id: "b", text: "Making people want to please you.", scores: { visibility: 5, powerSource: -20 } },
      { id: "c", text: "Making the situation so tilted the answer is obvious.", scores: { control: 15, timeHorizon: 15 } },
      { id: "d", text: "Making them believe it was their idea.", scores: { control: 10, timeHorizon: 5, powerSource: -10 } },
    ],
  },
  {
    id: "q23",
    kind: "tiebreaker",
    prompt: "Your most satisfying wins usually:",
    probes: ["timeHorizon"],
    options: [
      { id: "a", text: "Come in a single moment, cleanly.", scores: { timeHorizon: -20, powerSource: 10 } },
      { id: "b", text: "Take years, and few people see the full chain.", scores: { visibility: -15, timeHorizon: 20 } },
      { id: "c", text: "Build slowly in public, then lock in all at once.", scores: { visibility: 15, timeHorizon: 10 } },
      { id: "d", text: "Come from moving faster than everyone else.", scores: { timeHorizon: -15, powerSource: 10 } },
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
    prompt: "What's one thing people consistently underestimate about you?",
    maxLength: 200,
    optional: true,
    usageNote: "Used to frame your 'hidden edge' section in the PDF report. Skipping reduces personalization.",
  },
];

export const choiceQuestions = questions.filter(
  (q): q is ChoiceQuestion => q.kind !== "free-text"
);

export const freeTextQuestions = questions.filter(
  (q): q is FreeTextQuestion => q.kind === "free-text"
);
