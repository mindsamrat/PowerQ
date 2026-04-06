export interface QuizOption {
  text: string;
  scores: { control: number; visibility: number; patience: number };
}

export interface QuizQuestion {
  id: number;
  question: string;
  subtitle: string;
  options: QuizOption[];
}

export const questions: QuizQuestion[] = [
  {
    id: 1,
    question: "You walk into a room of strangers at a high-status event. What do you do first?",
    subtitle: "This reveals your dominance signaling pattern and social threat-assessment wiring.",
    options: [
      { text: "Find the most powerful person and introduce yourself", scores: { control: 80, visibility: 90, patience: 20 } },
      { text: "Observe from the edges. Map the room before speaking to anyone", scores: { control: 70, visibility: 10, patience: 90 } },
      { text: "Find a small group, make yourself indispensable to the conversation", scores: { control: 50, visibility: 50, patience: 60 } },
      { text: "Make a loud entrance. If they don't notice you, they will", scores: { control: 60, visibility: 100, patience: 10 } },
    ],
  },
  {
    id: 2,
    question: "A business partner betrays you publicly. Your move?",
    subtitle: "Measures your cortisol-driven retaliation impulse versus prefrontal strategic override.",
    options: [
      { text: "Confront them directly. Make it clear there are consequences", scores: { control: 90, visibility: 80, patience: 20 } },
      { text: "Say nothing. Dismantle their support network quietly over months", scores: { control: 90, visibility: 5, patience: 100 } },
      { text: "Reframe the narrative publicly so you come out ahead", scores: { control: 60, visibility: 90, patience: 50 } },
      { text: "Cut them off instantly and move on. Their loss", scores: { control: 50, visibility: 30, patience: 10 } },
    ],
  },
  {
    id: 3,
    question: "What kind of wealth matters most to you?",
    subtitle: "Reveals whether you optimize for resource accumulation, status signaling, or optionality.",
    options: [
      { text: "Control over people and decisions", scores: { control: 100, visibility: 50, patience: 50 } },
      { text: "Invisible assets. No one knows what you own", scores: { control: 80, visibility: 0, patience: 80 } },
      { text: "Public empire. The brand, the name, the legacy", scores: { control: 70, visibility: 100, patience: 70 } },
      { text: "Liquid cash. Freedom to move fast, anywhere", scores: { control: 40, visibility: 20, patience: 10 } },
    ],
  },
  {
    id: 4,
    question: "You're offered a leadership role, but you'd report to someone incompetent. What do you do?",
    subtitle: "Tests your tolerance for hierarchical constraint and covert power accumulation instinct.",
    options: [
      { text: "Take it. Outmanoeuvre them from inside until the role is truly yours", scores: { control: 80, visibility: 30, patience: 90 } },
      { text: "Decline. You don't build under a ceiling", scores: { control: 90, visibility: 60, patience: 30 } },
      { text: "Take it but build a parallel power base they don't see", scores: { control: 90, visibility: 10, patience: 80 } },
      { text: "Negotiate. Restructure the reporting line before you accept", scores: { control: 70, visibility: 60, patience: 50 } },
    ],
  },
  {
    id: 5,
    question: "Your greatest fear?",
    subtitle: "The amygdala's deepest encoding. What you fear most reveals what you value most.",
    options: [
      { text: "Being irrelevant", scores: { control: 60, visibility: 100, patience: 40 } },
      { text: "Being controlled by someone else", scores: { control: 100, visibility: 40, patience: 50 } },
      { text: "Making a move too early and losing everything", scores: { control: 60, visibility: 30, patience: 100 } },
      { text: "Staying in one place too long", scores: { control: 40, visibility: 40, patience: 0 } },
    ],
  },
  {
    id: 6,
    question: "You discover a competitor's critical weakness. What do you do?",
    subtitle: "Measures your Machiavellian intelligence quotient and temporal discounting bias.",
    options: [
      { text: "Exploit it immediately, publicly", scores: { control: 70, visibility: 90, patience: 10 } },
      { text: "Store it. Use it only when you need maximum leverage", scores: { control: 80, visibility: 10, patience: 100 } },
      { text: "Leak it through third parties so your hands stay clean", scores: { control: 70, visibility: 5, patience: 70 } },
      { text: "Use it to negotiate a partnership on your terms", scores: { control: 60, visibility: 50, patience: 60 } },
    ],
  },
  {
    id: 7,
    question: "Which statement describes you best?",
    subtitle: "Core identity axis. This maps directly to your power orientation phenotype.",
    options: [
      { text: "I'd rather be feared than loved", scores: { control: 100, visibility: 70, patience: 50 } },
      { text: "I'd rather be invisible than famous", scores: { control: 70, visibility: 0, patience: 80 } },
      { text: "I'd rather be respected than rich", scores: { control: 60, visibility: 80, patience: 70 } },
      { text: "I'd rather be free than powerful", scores: { control: 30, visibility: 30, patience: 20 } },
    ],
  },
  {
    id: 8,
    question: "You have a large sum to invest. Where does it go?",
    subtitle: "Investment psychology reveals risk tolerance, need for control, and time-horizon wiring.",
    options: [
      { text: "A business I control completely", scores: { control: 100, visibility: 60, patience: 50 } },
      { text: "Real estate. Silent, compounding, unsexy", scores: { control: 60, visibility: 10, patience: 90 } },
      { text: "A public brand or media company", scores: { control: 70, visibility: 100, patience: 60 } },
      { text: "High-risk, high-reward bets. Crypto, startups, whatever's moving", scores: { control: 40, visibility: 40, patience: 5 } },
    ],
  },
  {
    id: 9,
    question: "How do people usually describe you?",
    subtitle: "External perception mapping. The gap between self-image and social image is where power leaks.",
    options: [
      { text: "Intense", scores: { control: 80, visibility: 70, patience: 40 } },
      { text: "Hard to read", scores: { control: 70, visibility: 10, patience: 80 } },
      { text: "Charismatic", scores: { control: 50, visibility: 90, patience: 50 } },
      { text: "Unpredictable", scores: { control: 60, visibility: 50, patience: 10 } },
    ],
  },
  {
    id: 10,
    question: "Someone gives you advice you didn't ask for. Your reaction?",
    subtitle: "Tests ego permeability and authority resistance. High-power individuals filter, not absorb.",
    options: [
      { text: "Listen, then do what I was going to do anyway", scores: { control: 90, visibility: 30, patience: 60 } },
      { text: "Evaluate it coldly. If it's useful, take it. If not, discard them", scores: { control: 80, visibility: 20, patience: 70 } },
      { text: "Thank them publicly, ignore it privately", scores: { control: 50, visibility: 70, patience: 60 } },
      { text: "Tell them directly you didn't ask", scores: { control: 70, visibility: 60, patience: 10 } },
    ],
  },
  {
    id: 11,
    question: "Pick the empire.",
    subtitle: "Empire selection reveals your deepest power fantasy and neurological reward pathway.",
    options: [
      { text: "Political dynasty. Your family runs the country for generations", scores: { control: 100, visibility: 80, patience: 100 } },
      { text: "Intelligence network. You know everything about everyone", scores: { control: 90, visibility: 0, patience: 80 } },
      { text: "Media conglomerate. You shape what people think", scores: { control: 70, visibility: 100, patience: 60 } },
      { text: "Trading empire. You go where the money is, no loyalty to geography", scores: { control: 50, visibility: 40, patience: 10 } },
    ],
  },
  {
    id: 12,
    question: "A protege you mentored now rivals you. Response?",
    subtitle: "Threat-from-within processing. Reveals attachment style under competitive stress.",
    options: [
      { text: "Good. Competition sharpens me", scores: { control: 60, visibility: 60, patience: 50 } },
      { text: "I never mentor without building in a dependency. They can't rival me", scores: { control: 100, visibility: 10, patience: 90 } },
      { text: "Publicly endorse them. Then outperform them quietly", scores: { control: 60, visibility: 70, patience: 70 } },
      { text: "Drop them. Redirect my energy to someone still loyal", scores: { control: 70, visibility: 30, patience: 20 } },
    ],
  },
  {
    id: 13,
    question: "What's your relationship with rules?",
    subtitle: "Rule orientation maps to prefrontal inhibition strength and moral flexibility index.",
    options: [
      { text: "I make them", scores: { control: 100, visibility: 80, patience: 60 } },
      { text: "I work around them without anyone noticing", scores: { control: 80, visibility: 0, patience: 80 } },
      { text: "I follow them until I'm powerful enough to rewrite them", scores: { control: 70, visibility: 50, patience: 90 } },
      { text: "Rules are for people who can't afford to break them", scores: { control: 60, visibility: 50, patience: 10 } },
    ],
  },
  {
    id: 14,
    question: "How do you handle being publicly humiliated?",
    subtitle: "Humiliation response reveals your nervous system's fight-flight-freeze dominance hierarchy.",
    options: [
      { text: "Immediate retaliation. The cost of disrespecting me must be visible", scores: { control: 80, visibility: 90, patience: 5 } },
      { text: "Silence. Then systematic destruction over the next 6 months", scores: { control: 90, visibility: 5, patience: 100 } },
      { text: "Laugh it off publicly. Settle it privately", scores: { control: 60, visibility: 70, patience: 60 } },
      { text: "Leave. I don't play games with people beneath me", scores: { control: 50, visibility: 40, patience: 20 } },
    ],
  },
  {
    id: 15,
    question: "If you could be remembered for one thing, what would it be?",
    subtitle: "Legacy encoding. The final question maps your deepest narrative identity.",
    options: [
      { text: "The one who built something that outlasted everyone", scores: { control: 80, visibility: 60, patience: 100 } },
      { text: "The one nobody saw coming", scores: { control: 80, visibility: 0, patience: 80 } },
      { text: "The one everyone wanted to follow", scores: { control: 60, visibility: 100, patience: 50 } },
      { text: "The one who lived on their own terms", scores: { control: 30, visibility: 40, patience: 20 } },
    ],
  },
];
