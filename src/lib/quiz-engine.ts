import { questions, type Question, type ChoiceQuestion, type FreeTextQuestion, type EmailQuestion, type OptionId } from "@/data/questions";
import { calculateAxisScores, matchArchetype, computePQ, type AnswerDelta, type AxisScores, type MatchResult, type ScoredAnswer } from "@/lib/scoring";
import { CONFIDENCE_HIGH_GAP, CONFIDENCE_HIGH_PQ, CONFIDENCE_HIGH_MIN_SPREAD, meanSpread } from "@/lib/result-analysis";

export interface ChoiceAnswer {
  questionId: string;
  optionId: OptionId;
  delta: AnswerDelta;
  /** Position (0–3) the option was displayed in. Options are shuffled per session; this lets us measure position bias later. */
  pos?: number;
}

export interface FreeTextAnswer {
  questionId: string;
  text: string;
}

export interface QuizProgress {
  served: string[];
  choiceAnswers: ChoiceAnswer[];
  freeTextAnswers: FreeTextAnswer[];
}

export function emptyProgress(): QuizProgress {
  return { served: [], choiceAnswers: [], freeTextAnswers: [] };
}

const calibration = questions.filter((q): q is ChoiceQuestion => q.kind === "calibration");
const branched = questions.filter((q): q is ChoiceQuestion => q.kind === "branched");
const tiebreakers = questions.filter((q): q is ChoiceQuestion => q.kind === "tiebreaker");
const freeText = questions.filter((q): q is FreeTextQuestion => q.kind === "free-text");
const email = questions.filter((q): q is EmailQuestion => q.kind === "email");

/**
 * Build the maximum plan a user can see: all calibration + branched +
 * tiebreaker + free-text + email questions in order. The tiebreaker block is
 * conditionally skipped at runtime by nextServableCursor() when the interim
 * archetype match is already unambiguous — so a clear respondent answers 24
 * choice questions instead of 27 (plus two optional free-text steps and the
 * email step).
 */
export function buildQuizPlan(_seed?: string): Question[] {
  void _seed;
  return [...calibration, ...branched, ...tiebreakers, ...freeText, ...email];
}

/** Minimum runner-up fit gap (match-strength points) required to skip the tiebreaker block. */
const TIEBREAKER_SKIP_GAP = CONFIDENCE_HIGH_GAP;
/** …and the interim signature must already be reasonably well-defined. */
const TIEBREAKER_SKIP_PQ = CONFIDENCE_HIGH_PQ;

export interface ProgressInfo {
  kind: "choice" | "free-text" | "email";
  /** 1-based number of the current choice question (choice steps only). */
  questionNumber: number;
  /** 27, or 24 once the tiebreakers have actually been skipped. Never grows. */
  questionTotal: number;
  /** 0–1 for the progress bar. Only ever moves forward. */
  fraction: number;
}

/**
 * Progress for the quiz header. The tiebreaker skip is only counted once it
 * has actually happened (the cursor is past the block without serving it),
 * so totals can shrink once but never grow, and the bar never moves backwards.
 */
export function progressInfo(cursor: number, plan: Question[], progress: QuizProgress): ProgressInfo {
  const current = plan[Math.min(cursor, plan.length - 1)];
  const tiebreakerIndexes = plan.map((q, i) => (q.kind === "tiebreaker" ? i : -1)).filter((i) => i >= 0);
  const lastTiebreaker = tiebreakerIndexes.length ? Math.max(...tiebreakerIndexes) : -1;
  const servedTiebreaker = progress.served.some((id) => tiebreakers.some((t) => t.id === id));
  const skipped = lastTiebreaker >= 0 && cursor > lastTiebreaker && !servedTiebreaker;
  const choiceTotal = plan.filter((q) => q.kind !== "free-text" && q.kind !== "email").length - (skipped ? tiebreakerIndexes.length : 0);
  const stepTotal = plan.length - (skipped ? tiebreakerIndexes.length : 0);
  return {
    kind: current.kind === "free-text" ? "free-text" : current.kind === "email" ? "email" : "choice",
    questionNumber: Math.min(progress.choiceAnswers.length + 1, choiceTotal),
    questionTotal: choiceTotal,
    fraction: Math.min(1, (progress.served.length + 1) / stepTotal),
  };
}

/**
 * Advance the cursor past any question that no longer needs to be served.
 *
 * The only adaptive rule: skip the three tiebreaker questions when, at that
 * point, the interim match already meets the "Strong match" bar (fit gap,
 * PQ and spread thresholds shared with readConfidence in result-analysis).
 *
 * Returns the index of the next question the UI should render. Returns
 * `plan.length` when there's nothing left.
 */
export function nextServableCursor(
  fromCursor: number,
  plan: Question[],
  progress: QuizProgress
): number {
  let i = fromCursor;
  while (i < plan.length) {
    const q = plan[i];
    if (q.kind !== "tiebreaker") return i;

    // Only evaluate the skip rule once we actually have data to evaluate on.
    if (progress.choiceAnswers.length < 10) return i;

    const scored = toScored(progress.choiceAnswers);
    const interim = calculateAxisScores(scored);
    const match = matchArchetype(interim);
    const interimPq = computePQ(interim, scored);

    if (match.gap >= TIEBREAKER_SKIP_GAP && interimPq >= TIEBREAKER_SKIP_PQ && meanSpread(interim) >= CONFIDENCE_HIGH_MIN_SPREAD) {
      // Confidently matched — skip every contiguous tiebreaker that follows.
      i += 1;
      continue;
    }
    return i;
  }
  return i;
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function deltaFromChoice(question: ChoiceQuestion, optionId: OptionId): AnswerDelta {
  const option = question.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Unknown option ${optionId} on ${question.id}`);
  return {
    control: option.scores.control ?? 0,
    visibility: option.scores.visibility ?? 0,
    timeHorizon: option.scores.timeHorizon ?? 0,
    powerSource: option.scores.powerSource ?? 0,
  };
}

export interface FinalResult {
  match: MatchResult;
  scores: AxisScores;
  pq: number;
  freeText: FreeTextAnswer[];
}

function toScored(answers: ChoiceAnswer[]): ScoredAnswer[] {
  return answers.map((a) => ({ questionId: a.questionId, delta: a.delta }));
}

export function finalize(progress: QuizProgress): FinalResult {
  const scored = toScored(progress.choiceAnswers);
  const scores = calculateAxisScores(scored);
  const match = matchArchetype(scores);
  const pq = computePQ(scores, scored);
  return { match, scores, pq, freeText: progress.freeTextAnswers };
}
