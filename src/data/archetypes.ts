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
  /** Animal totem assigned to this archetype. Adds an identity hook beyond the name. */
  totem: { animal: string; meaning: string };
  /** 3 scenarios where this archetype wins, used in the paid PDF. */
  winScenarios: { label: string; text: string }[];
  /** 3 failure modes specific to this archetype, used in the paid PDF. */
  loseModes: { label: string; text: string }[];
  /** Power Pairings: which archetypes amplify, neutralise, or drain this one. */
  pairings: {
    amplifies: { id: string; reason: string };
    drains: { id: string; reason: string };
  };
  /** 90-day improvement plan tailored to this archetype. */
  roadmap: { phase: string; weeks: string; focus: string }[];
  /** Personal-letter close ("Dear [Name]" template body). */
  closingLetter: string;
  /** 3 relatable life-pattern scenarios common among this archetype. */
  lifePatterns: { context: string; pattern: string }[];
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
    totem: { animal: "Lion", meaning: "Visible apex. Holds territory by being seen, not by hiding. The pride watches the lion to know what to do." },
    winScenarios: [
      { label: "In the boardroom", text: "When a decision needs to be made and the room is paralysed, you make it. Your speed of conviction collapses other people's hesitation. You tend to be promoted faster than peers because authority recognises authority." },
      { label: "In partnerships", text: "You set the standard early. Partners self-select based on whether they can match your weight. The relationships you build are public, formal, and have explicit terms — which makes them durable when stress hits." },
      { label: "In a crisis", text: "Crisis is your home turf. While others freeze, you absorb blame, give one clear order, and pull the room behind you. People remember crises by who took the call. They will remember you." },
    ],
    loseModes: [
      { label: "Echo chamber", text: "Your authority makes people stop disagreeing with you. By year three of any role, your team is filtering reality before it reaches you. You discover problems six months too late." },
      { label: "The brittle throne", text: "You build institutions around your own taste. When you leave the room, the institution breaks. Sovereigns who don't groom successors are remembered as failures regardless of how well they ran things." },
      { label: "Loyalty as theatre", text: "You mistake compliance for agreement. The first sign your inner circle has gone hollow is that meetings get easier. They aren't easier — people just stopped trying." },
    ],
    pairings: {
      amplifies: { id: "architect", reason: "Architects build the durable systems that survive past your reign. A Sovereign without an Architect builds a brand. With one, you build an institution." },
      drains: { id: "shadow", reason: "Shadows do not contest your authority openly. They accumulate small advantages in your blind spots. Two years in you discover decisions you thought were yours were already made for you." },
    },
    roadmap: [
      { phase: "Foundation", weeks: "Weeks 1-3", focus: "Audit your information channels. Name the people whose interpretation of reality you trust by default. That list is your blind spot." },
      { phase: "Recalibration", weeks: "Weeks 4-7", focus: "Add one advisor whose only job is to disagree with you, in writing, weekly. Pay them enough that they stay candid." },
      { phase: "Succession", weeks: "Weeks 8-12", focus: "Identify your second. Invest one hour a week training them to make your decisions in your voice. The institution begins to outlive you in week 12." },
    ],
    closingLetter:
      "The Sovereign archetype is the most public form of power, which means it carries the most public form of consequence. The version of you that succeeds at 60 is not the same one that wins at 30 — it is the one who learns, somewhere in the middle, that the throne is a tool, not a trophy. Build the institution. Name the successor. Let one person tell you no. The rest will follow.",
    lifePatterns: [
      { context: "In group projects since school", pattern: "You always end up the de-facto leader, whether or not you wanted the role. People look at you when there's a decision to make and you make it. You've sometimes resented the weight; you've never quite handed it back." },
      { context: "When relationships shift", pattern: "You're usually the one who ends them, and you usually do it cleanly. The people you've left rarely hate you — they describe you as 'inevitable.' You can read this as cold; it's actually clarity." },
      { context: "When you're not in charge", pattern: "Working under someone you don't respect feels physically uncomfortable. You will tolerate it for a year, maybe two, and then you'll either reshape the situation or leave. There is no third option." },
    ],
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
    totem: { animal: "Raven", meaning: "Watches before it moves. Memory carrier. Always knows where the bodies are. Disappears the second after it lands." },
    winScenarios: [
      { label: "In high-stakes negotiation", text: "You arrive having already mapped what the other side wants and what they fear. They think they're shaping the deal; the deal is being shaped before they sit down. Outcomes feel like coincidence to everyone but you." },
      { label: "Inside a coalition", text: "You become the connective tissue. Three years later people can't quite remember when you became indispensable. Removing you would require dismantling things they don't want to dismantle." },
      { label: "When others fail visibly", text: "Your reputation rises through other people's failures because you were one degree removed from each one. You bear no scar; you carry every lesson." },
    ],
    loseModes: [
      { label: "The stockpile that rots", text: "Information you never spend becomes a liability. After year five you have too much leverage to use without revealing yourself, and the leverage decays into trivia." },
      { label: "Total opacity", text: "You become so unreadable that even your closest allies don't trust you. Loyalty requires legibility. Your opacity, past a threshold, costs you the network you spent decades building." },
      { label: "Mistaking patience for paralysis", text: "Some windows close. The Shadow's classic failure is the move never made — the year-six action that would have crowned the strategy, but you waited for one more confirming signal." },
    ],
    pairings: {
      amplifies: { id: "diplomat", reason: "Diplomats give your invisible work a face the world can engage with. A Shadow paired with a Diplomat looks like a happy coincidence; it isn't." },
      drains: { id: "sovereign", reason: "Sovereigns demand visibility and credit, which is your blast radius. Long collaborations with a Sovereign reveal your shape. Choose engagements that end before they require you to be seen." },
    },
    roadmap: [
      { phase: "Audit", weeks: "Weeks 1-3", focus: "List every leverage position you currently hold. Note which ones you have used in the last year. The unused ones are the ones to pressure-test or release." },
      { phase: "Surface once", weeks: "Weeks 4-8", focus: "Pick one professional moment to claim credit publicly and clearly. Specific, dated, attributable. You do not need to do this twice. Once a year is enough to keep your network real." },
      { phase: "Apprentice one", weeks: "Weeks 9-12", focus: "Find one person you trust and start teaching them how to see what you see. Pure shadows die forgotten. Train one inheritor and the pattern survives you." },
    ],
    closingLetter:
      "Shadows are the rarest type because the cost of becoming one is high and the rewards are private. You will not get a parade. You will get rooms quietly arranged around your interest, decisions other people think are theirs, and a long career that no one quite knows the shape of. That is the trade. Be careful that the trade is still worth it at year fifteen.",
    lifePatterns: [
      { context: "In groups", pattern: "You have always preferred to listen first. People tell you things they don't tell others — and then forget they did. You've quietly carried information that could have changed several rooms; you usually decide not to use it." },
      { context: "When credit is being handed out", pattern: "You step back from credit even when you did the work. Sometimes this is strategic; sometimes it's habit. You've watched louder people get promoted past you and felt complicated about it. You weren't wrong to wait — but you may have waited too long once or twice." },
      { context: "Close relationships", pattern: "Trust is harder for you than people realise. You're warm enough to read as warm, guarded enough that even your closest people sometimes feel like they don't fully know you. The few you do let in have known for a long time." },
    ],
  },
  {
    id: "architect",
    name: "The Architect",
    tagline: "Designs systems that outlive their creator.",
    control: { min: 60, max: 80 },
    visibility: { min: 40, max: 60 },
    timeHorizon: { min: 80, max: 100 },
    powerSource: { min: 35, max: 55 },
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
    totem: { animal: "Owl", meaning: "Sees in the dark. Builds the nest before the storm. Doesn't move until the move is right; moves decisively when it is." },
    winScenarios: [
      { label: "Designing institutions", text: "You see the second-order consequences others miss. The org chart you draft today still works in year ten because you built for the dynamic, not the snapshot." },
      { label: "Long-horizon investing", text: "Your flat temporal-discount curve gives you a structural edge in any domain where patience compounds. You routinely make trades that look mediocre at year two and obvious at year seven." },
      { label: "After a crisis", text: "While others fight fires, you redesign the building. Architects do their best work in the year following a collapse — your blueprints land in soil that's finally ready." },
    ],
    loseModes: [
      { label: "Analysis paralysis", text: "Your simulations are so detailed that execution feels like a downgrade. The plan in your head is always better than the v1 you could ship today. Most Architects never lose; they never start." },
      { label: "Ivory tower drift", text: "Without a tight feedback loop you build for elegance instead of fit. Your blueprint solves the problem you imagined three years ago, not the one in front of you." },
      { label: "Disdain for momentum", text: "You sometimes mistake decisiveness for stupidity. Blades and Hunters move before you finish thinking, and sometimes they win because moving is the answer." },
    ],
    pairings: {
      amplifies: { id: "blade", reason: "A Blade gives your system its motor. They will make your imperfect plan run today, and the plan-while-running gets sharper than the plan-on-paper ever could." },
      drains: { id: "hunter", reason: "Hunters demand answers your timeline can't give them. Long-running Architect/Hunter projects calcify into resentment on both sides — you think they're reckless, they think you're stalling." },
    },
    roadmap: [
      { phase: "Compress", weeks: "Weeks 1-3", focus: "Pick one project you've been planning for over six months. Force-ship a v1 by week 3. The criterion is 'works' not 'right'." },
      { phase: "Pair", weeks: "Weeks 4-7", focus: "Recruit a Blade or Hunter to be your shipping partner. Give them veto power on perfectionism. Your job is to be persuaded out of one polish-step a week." },
      { phase: "Document", weeks: "Weeks 8-12", focus: "Capture the reasoning behind the decisions you actually made (not the ones you almost made). Reasoning compounds; conclusions age." },
    ],
    closingLetter:
      "Architects build things that outlive them. The catch: they only outlive you if they exist. The blueprint folder full of unbuilt buildings is the saddest artifact in any career. Pick one. Build it. The next one comes easier because the first one happened.",
    lifePatterns: [
      { context: "When you have a new idea", pattern: "You can spend three months sketching the system before you ship anything. Sometimes that produces the breakthrough. Sometimes the moment passes and someone with half your insight ships a worse version that wins." },
      { context: "In conversations", pattern: "You quietly model two-three steps ahead of what people are saying. Friends sometimes describe you as 'distant' when really you're parsing implications they don't see yet. You've felt lonely for this reason." },
      { context: "When systems break", pattern: "Crises that paralyse others are oddly clarifying for you. You're at your best after collapse — when the old structure is gone and the room is finally ready to listen to your blueprint." },
    ],
  },
  {
    id: "oracle",
    name: "The Oracle",
    tagline: "Power through insight others cannot replicate.",
    control: { min: 15, max: 35 },
    visibility: { min: 30, max: 50 },
    timeHorizon: { min: 70, max: 90 },
    powerSource: { min: 5, max: 25 },
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
    totem: { animal: "Serpent", meaning: "Sees through still water. Strikes once, then waits. Carries every old wisdom and never explains itself." },
    winScenarios: [
      { label: "Diagnosing a stuck system", text: "You walk into a team that's been running in circles and within an hour you've named the actual problem. Your value rises sharply when others' frameworks have failed." },
      { label: "Long bets", text: "Your forecasts age well. The trades you make on year-five horizons become reputation when they pay off — and they pay off, because you only place bets you can defend." },
      { label: "Mentoring", text: "You shape people by naming patterns in them they hadn't yet articulated. The students you produce carry your vocabulary; through them you outlive your own career." },
    ],
    loseModes: [
      { label: "The prophet without followers", text: "You see clearly and explain badly. Your warnings land as arrogance because you can't translate the pattern into the listener's vocabulary. Right and unheard is still wrong, in practice." },
      { label: "Insight as substitute for action", text: "Pattern recognition is intoxicating, and Oracles sometimes confuse seeing with doing. A correctly diagnosed problem you didn't act on is still a problem, plus a regret." },
      { label: "Confirmation drift", text: "Once you've named a pattern publicly, every new data point confirms it. Oracles who don't actively look for disconfirming evidence calcify into pundits." },
    ],
    pairings: {
      amplifies: { id: "diplomat", reason: "Diplomats translate your patterns into language coalitions can act on. Oracle/Diplomat partnerships have shaped foreign policy for centuries — you see, they move." },
      drains: { id: "hunter", reason: "Hunters discount your timeline and think you're slow. Long collaborations with Hunters tend to end with you watching them re-learn a lesson you flagged two years prior." },
    },
    roadmap: [
      { phase: "Time-stamp", weeks: "Weeks 1-3", focus: "Start a private prediction journal with dated entries. Specific predictions only. Your track record is the only credential that scales." },
      { phase: "Translate", weeks: "Weeks 4-7", focus: "Take your three strongest insights and rewrite each in language a Blade would act on. If they can't act on it, you haven't translated yet." },
      { phase: "Apprentice", weeks: "Weeks 8-12", focus: "Pick one person you'll spend a year teaching to read what you read. Oracles who don't teach are forgotten the year they retire." },
    ],
    closingLetter:
      "The Oracle's gift is also the loneliness of being early. Most of what you'll be right about, you'll be right about alone. The trick is to learn to translate without resenting the translation. The pattern was never the point; the people you helped see it were.",
    lifePatterns: [
      { context: "Long before others see it", pattern: "You named a problem six months early and got told you were being negative. The problem arrived. Some people remembered you flagged it; most didn't. You learned to soften how you say things, but the seeing didn't slow down." },
      { context: "In friendships", pattern: "People bring you their tangled situations expecting you to listen, and you can't help yourself — you see the pattern and you name it. Sometimes they wanted comfort, not analysis. You've worked on noticing the difference; it's still your default to diagnose." },
      { context: "When you're wrong", pattern: "When your prediction misses, you take it personally — more than the people who were never asked to predict in the first place. The ones who get the future wrong publicly remember it longer. Build that into the work." },
    ],
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
    totem: { animal: "Wolf", meaning: "Single-minded pursuit. Closes the distance fast. Pack-aware but never consensus-bound. Bites once, decisively." },
    winScenarios: [
      { label: "Stalled situations", text: "Anywhere others have been hesitating for months, you arrive and force the move. Your willingness to be wrong fast collapses other people's analysis paralysis." },
      { label: "Asymmetric fights", text: "When you have less to lose, you wield speed as the variable that doesn't show up in their model. Blades win matchups where the spreadsheet says they shouldn't." },
      { label: "Crisis turnaround", text: "You make decisions in the first 48 hours that take competitors three weeks. Your scar tissue from being wrong-fast trains the team faster than any retreat would." },
    ],
    loseModes: [
      { label: "Cut once too many", text: "Half your scars are from cutting too soon. Blades who don't develop a 48-hour-pause habit on irreversible moves accumulate bridges burned that they later need." },
      { label: "Speed as identity", text: "When your reputation IS speed, slowing down feels like betrayal. The Blade trap is staying kinetic in domains where compounding would have served better." },
      { label: "No second", text: "You move so fast your team can't keep up. Blades without an Architect partner end careers as solo operators — talented, feared, structurally lonely." },
    ],
    pairings: {
      amplifies: { id: "architect", reason: "Architects give your speed direction. They tell you which moves are reversible and which aren't. The pairing turns your kinetic energy into compound growth." },
      drains: { id: "oracle", reason: "Oracles slow you down by 12 months trying to convince you of patterns you don't have time for. You're not wrong to ignore them; you're wrong to do it 100% of the time." },
    },
    roadmap: [
      { phase: "The pause", weeks: "Weeks 1-3", focus: "Implement a 48-hour rule on irreversible moves involving people who can't protect themselves. The pause is the discipline." },
      { phase: "Anchor", weeks: "Weeks 4-7", focus: "Pick one Architect-type advisor with veto power on long-horizon decisions. Pay them. Listen to them on dates ending in zero." },
      { phase: "Compound something", weeks: "Weeks 8-12", focus: "Identify one position you'd normally exit. Stay in it. The discipline isn't slowing down generally — it's letting one thing run." },
    ],
    closingLetter:
      "Speed is your gift. Speed is also the thing that ends most Blade careers in their forties. The version of you that becomes legendary is the one who learns when not to cut. Pick the right cut. Build the right second. The next forty years are about subtraction.",
    lifePatterns: [
      { context: "Decision speed", pattern: "You make decisions in the time others use to schedule the meeting about the decision. People describe you as 'intense' or 'a lot.' Both are true. Both are usually said with admiration that someone disguises as criticism." },
      { context: "When you've been wrong", pattern: "You've burned a relationship or a job or a deal by moving too fast. You don't dwell on it the way others would expect — but the cost is real, and it shows up later in unexpected places. Track them." },
      { context: "Stillness", pattern: "Doing nothing genuinely makes you uncomfortable. Vacations are awkward; long meetings feel like punishment. The discipline you most need to develop is the one that feels least natural — the discipline of waiting." },
    ],
  },
  {
    id: "diplomat",
    name: "The Diplomat",
    tagline: "Wins without anyone knowing war was fought.",
    control: { min: 45, max: 65 },
    visibility: { min: 70, max: 90 },
    timeHorizon: { min: 70, max: 90 },
    powerSource: { min: 10, max: 30 },
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
    totem: { animal: "Crane", meaning: "Walks between waters. Never rushes. Holds equal grace toward predator and prey. The room reorganises itself around its calm." },
    winScenarios: [
      { label: "Stuck negotiations", text: "Where two sides are locked in, you find the third axis nobody named. Your value spikes when other people's frameworks have produced stalemate." },
      { label: "Cross-cultural work", text: "Your default to 'translate' rather than 'judge' makes you the natural broker in any room where people speak different professional languages." },
      { label: "Long alliances", text: "Your relationships compound. The colleague you were patient with at 25 funds your idea at 40. Diplomats outperform their resume by year fifteen." },
    ],
    loseModes: [
      { label: "The kept room", text: "You will not break the alliance even when it's the right move. The ceiling on Diplomat power is the number of relationships you refuse to lose." },
      { label: "Consensus as idol", text: "You can solve disagreements too fast. Sometimes tension is the leverage. Killing it early kills the deal you would have been able to make later." },
      { label: "Likability without spine", text: "If the room never sees you take a hard line, your skill reads as service rather than power. Power requires occasional refusal." },
    ],
    pairings: {
      amplifies: { id: "shadow", reason: "Shadows give you covert reach you wouldn't claim for yourself. They do the work; you handle the public face. The pairing is rare and devastatingly effective." },
      drains: { id: "flame", reason: "Flames win rooms in minutes through magnetism while you build alignment in months. In direct competition the Flame seems to win first; you are not always sure how to compete." },
    },
    roadmap: [
      { phase: "Name the line", weeks: "Weeks 1-3", focus: "Write down three things you will not compromise on. The list is short. It is sacred. Tell three trusted people what's on it." },
      { phase: "Practice the cost", weeks: "Weeks 4-7", focus: "Pick one alliance you'll consciously let cool because it costs you the line. Surviving that loss is the threshold of Diplomat power." },
      { phase: "Lead the hard ask", weeks: "Weeks 8-12", focus: "Be the one who names the difficult thing first in three meetings this quarter. Diplomacy with courage is power. Without courage, it's hospitality." },
    ],
    closingLetter:
      "Diplomats are the most loved archetype, which means the temptation to keep being loved is their core trap. Your power is the alliance you're willing to lose. The version of you that becomes great is the one who, just once, picked the line over the room. After that everything is easier.",
    lifePatterns: [
      { context: "Group dynamics", pattern: "You're often the bridge — the person both 'sides' trust. You feel responsible for the room. When the room fractures you feel it physically, and you can spend weeks rebuilding bridges no one asked you to mend. Some of those bridges weren't worth rebuilding." },
      { context: "Saying no", pattern: "'No' costs you more than it costs other people. You agree to things you didn't have time for and then quietly resent the agreement. The skill you most need is to let one person down on purpose, watch yourself survive it, and adjust the calibration." },
      { context: "Conflict avoidance", pattern: "You will route around a difficult conversation for months. The avoided conversation usually grows bigger; you usually pay the cost later, alone. The hard talk you keep postponing is almost always the one that would change the most." },
    ],
  },
  {
    id: "hunter",
    name: "The Hunter",
    tagline: "Opportunist. Moves fast. Extracts value. Exits.",
    control: { min: 45, max: 65 },
    visibility: { min: 15, max: 35 },
    timeHorizon: { min: 5, max: 25 },
    powerSource: { min: 35, max: 55 },
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
    totem: { animal: "Hawk", meaning: "Sees movement from a mile away. Strikes from height. Never lingers. Already on the next thermal before the rabbit hits the ground." },
    winScenarios: [
      { label: "New markets", text: "You see opportunity where others see chaos. Hunters thrive in unstructured environments because structure is what slows everyone else down." },
      { label: "Distressed assets", text: "Your detachment from sentiment makes you the ideal buyer when emotions have crashed an asset's price below its real value. You feel no nostalgia for what others paid." },
      { label: "Negotiation under pressure", text: "Your willingness to walk gives you the leverage others don't have. The Hunter who can leave any deal usually leaves with the better one." },
    ],
    loseModes: [
      { label: "The velocity trap", text: "You exit positions just before they would have compounded. Your peers — slower, less talented — end up with empires while you have a sequence of completed exits." },
      { label: "Burnt bridges", text: "Each exit costs you a relationship you might have needed at the next door. Hunters in their fifties often discover their network is wide and shallow when they need it deep." },
      { label: "Speed without selection", text: "Anything that moves becomes a target. Hunters who don't develop selection criteria spend twenty years optimising for tempo and zero years for mastery." },
    ],
    pairings: {
      amplifies: { id: "blade", reason: "Blades match your tempo without asking you to slow down. The pair operates faster than any team can defend against, which is sometimes exactly the right tool." },
      drains: { id: "architect", reason: "Architects ask you to wait through year two of a thesis and you don't trust the wait. The pair tends to dissolve before the thesis pays out." },
    },
    roadmap: [
      { phase: "Pick one", weeks: "Weeks 1-3", focus: "Identify one position you'd normally exit. Commit to staying in it for 12 months. The discipline is selection, not stillness." },
      { phase: "Anchor", weeks: "Weeks 4-7", focus: "Name one relationship you will not burn for any deal. Document why. Hunters with one immovable anchor outperform Hunters with none across every decade." },
      { phase: "Compound", weeks: "Weeks 8-12", focus: "Pick one of capital, reputation, or relationship — and start treating that one specific thing as if your career depended on its compounding. Pick what you most undervalue." },
    ],
    closingLetter:
      "Hunters get rich. Hunters rarely build empires. The difference is one decision — usually somewhere in your thirties — to let one specific thing run past your usual exit point. The work after that decision compounds in ways you can't currently picture. Pick the thing.",
    lifePatterns: [
      { context: "Career", pattern: "You change roles or directions more often than your peers. Some of those moves were brilliant timing; some were exits from things that would have rewarded you if you'd stayed. You can usually feel the difference between the two; you don't always trust the feeling." },
      { context: "Money", pattern: "You make and lose money in larger swings than most people. You're comfortable with the volatility, which is unusual and valuable. The part you're working on is the long position — the one you don't exit when the chart looks ugly at year two." },
      { context: "Relationships", pattern: "You've ended things cleanly that other people would have stayed in too long. You've also ended things prematurely. The one anchor relationship you don't burn for any deal is the difference between Hunter and Hunter-who-built-something." },
    ],
  },
  {
    id: "flame",
    name: "The Flame",
    tagline: "Power through magnetism. Pulls rather than pushes.",
    control: { min: 20, max: 40 },
    visibility: { min: 80, max: 100 },
    timeHorizon: { min: 25, max: 45 },
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
    totem: { animal: "Phoenix", meaning: "Burns visibly. Renews from its own ashes. Cannot help but be watched. The room it leaves is colder than the one it enters." },
    winScenarios: [
      { label: "Stages and audiences", text: "You become the thing the room can't look away from. Flames perform best where attention is the currency — media, performance, brand-building, anywhere a story is being told." },
      { label: "The first 30 days", text: "New jobs, new partnerships, new cities. Your magnetism converts the new room within a month. Flames are unparalleled at first impressions and short campaigns." },
      { label: "Persuasion under doubt", text: "When the case isn't air-tight on paper, your presence carries it. Investors back you, customers commit, partners say yes — for reasons they describe later as 'gut feel.'" },
    ],
    loseModes: [
      { label: "The cool room", text: "Magnetism that doesn't get reinforced with structure decays. Flames in their forties often describe a sense that the room got quieter — and they don't know what changed. Nothing changed. The signal just decayed." },
      { label: "Audience burn", text: "The people drawn to you arrive faster than you can deepen with them. By year five your network is wide and emotionally shallow." },
      { label: "Magnetism without spine", text: "Pure pull without occasional refusal becomes service. People love you and ignore your asks. Flames need to demonstrate cost — show that 'no' is in your vocabulary — to keep the magnetism a currency rather than a courtesy." },
    ],
    pairings: {
      amplifies: { id: "architect", reason: "Architects build the structures that carry your magnetism past the heat decay. A Flame paired with an Architect builds a brand that survives the lulls between charismatic peaks." },
      drains: { id: "diplomat", reason: "Diplomats win rooms slowly through composure when you win them quickly through heat. Long alongside-Diplomat collaborations tend to leave you feeling like the room moved on without you." },
    },
    roadmap: [
      { phase: "One boring system", weeks: "Weeks 1-3", focus: "Build one habit that runs whether the audience is watching or not — finance, calendar, exercise. Pick the one you most resist. That's the one." },
      { phase: "Three deepenings", weeks: "Weeks 4-7", focus: "Pick three relationships and invest in their depth this quarter. Stop collecting shallow ones for ninety days. Notice what shifts." },
      { phase: "Practice the no", weeks: "Weeks 8-12", focus: "Say the hard 'no' that costs you a room at least once. Magnetism survives one true no. It dies of yes." },
    ],
    closingLetter:
      "The Flame is the most enviable archetype and the hardest to age into. Magnetism is a young person's currency unless you trade it deliberately for something that compounds. Build the boring scaffolding now. The version of you at 50 will thank the version of you reading this.",
    lifePatterns: [
      { context: "Entering rooms", pattern: "People notice when you enter, even when you didn't try. You've been told you 'have a presence' since you were a teenager. Sometimes that attention is uncomfortable; sometimes it's exactly what you wanted. You haven't always known which was which." },
      { context: "Romantic dynamics", pattern: "People fall for you faster than they should and recover slower than they expect. You've sometimes been the unexpected protagonist in someone else's story — and not always wanted that role. You're not as casual about this as you sometimes appear." },
      { context: "Sustained focus", pattern: "Showing up for the unglamorous middle-stretch of a project is genuinely harder for you than for most. You can launch anything. Finishing without an audience is the muscle you're still building. That's not a flaw — it's the work." },
    ],
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
