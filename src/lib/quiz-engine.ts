import { questions, type Question, type ChoiceQuestion, type FreeTextQuestion, type OptionId } from "@/data/questions";
import { calculateAxisScores, matchArchetype, computePQ, type AnswerDelta, type AxisScores, type MatchResult } from "@/lib/scoring";

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

/**
 * Build the served-question plan for this user.
 *
 * With a 25-question bank and the spec's "25 questions per user" target, every
 * user currently sees the full bank: 5 calibration, 15 branched, 3 tiebreakers,
 * 2 free-text. Once the bank grows past 30, this selector should read
 * mid-quiz scores and sub-select from the branched pool. Keeping the shape
 * here so the caller need not change when branching is added.
 */
export function buildQuizPlan(_seed?: string): Question[] {
  void _seed;
  return [...calibration, ...branched, ...tiebreakers, ...freeText];
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

export function finalize(progress: QuizProgress): FinalResult {
  const deltas = progress.choiceAnswers.map((a) => a.delta);
  const scores = calculateAxisScores(deltas);
  const match = matchArchetype(scores);
  const pq = computePQ(scores);
  return { match, scores, pq, freeText: progress.freeTextAnswers };
}
