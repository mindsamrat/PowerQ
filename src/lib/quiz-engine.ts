import { questions, type Question, type ChoiceQuestion, type FreeTextQuestion, type EmailQuestion, type OptionId } from "@/data/questions";
import { calculateAxisScores, matchArchetype, computePQ, type AnswerDelta, type AxisScores, type MatchResult, type ScoredAnswer } from "@/lib/scoring";

export interface ChoiceAnswer {
  questionId: string;
  optionId: OptionId;
  delta: AnswerDelta;
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
 * archetype match is unambiguous — so most users complete in ~22 questions
 * even though the plan length is 27.
 */
export function buildQuizPlan(_seed?: string): Question[] {
  void _seed;
  return [...calibration, ...branched, ...tiebreakers, ...freeText, ...email];
}

/** Minimum runner-up fit gap (match-strength points) required to skip the tiebreaker block. */
const TIEBREAKER_SKIP_GAP = 14;
/** …and the interim signature must already be reasonably well-defined. */
const TIEBREAKER_SKIP_PQ = 48;

/**
 * How many further steps (questions actually served) lie ahead, given the
 * current progress. Used by the UI's progress bar so the "12 / 24" counter
 * stays honest even when tiebreakers will be skipped.
 */
export function remainingServedSteps(
  fromCursor: number,
  plan: Question[],
  progress: QuizProgress
): number {
  let i = fromCursor;
  let count = 0;
  while (i < plan.length) {
    const next = nextServableCursor(i, plan, progress);
    if (next >= plan.length) break;
    count += 1;
    i = next + 1;
  }
  return count;
}

/**
 * Advance the cursor past any question that no longer needs to be served.
 *
 * Right now the only adaptive rule is: skip the tiebreaker questions once
 * the user's interim archetype match has a runner-up gap of at least 8
 * units. This drops the typical served-question count from 27 down to ~22
 * without sacrificing match quality.
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

    if (match.gap >= TIEBREAKER_SKIP_GAP && interimPq >= TIEBREAKER_SKIP_PQ) {
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
