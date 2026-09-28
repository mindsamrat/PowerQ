import { choiceQuestions, type ChoiceQuestion } from "@/data/questions";
import { getCentroid, type Archetype, type AxisId } from "@/data/archetypes";

export const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

/** The archetype's direction from neutral (50/50/50/50) as a 4-vector. */
export function archetypeDirection(a: Archetype): number[] {
  const c = getCentroid(a);
  return AXES.map((ax) => c[ax] - 50);
}

/**
 * An option's deltas centred within its own question, so "high" means "higher
 * than this question's other options" rather than an absolute number. This is
 * the same convention the scorer uses; anything that compares options across
 * questions must use it.
 */
export function centredOptionVector(q: ChoiceQuestion, optionId: string): number[] | null {
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return null;
  return AXES.map((ax) => {
    const vals = q.options.map((o) => o.scores[ax] ?? 0);
    return (opt.scores[ax] ?? 0) - (Math.min(...vals) + Math.max(...vals)) / 2;
  });
}

export function cosine(a: number[], b: number[]): number {
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  if (na < 1e-9 || nb < 1e-9) return 0;
  return a.reduce((s, v, i) => s + v * b[i], 0) / (na * nb);
}

export interface SignatureOption {
  questionId: string;
  prompt: string;
  text: string;
  /** 0–100: how directly this option points at the archetype. */
  alignment: number;
}

/**
 * The answer options in the bank that point most directly at an archetype.
 * Used on the archetype study pages so readers can see, in the instrument's
 * own words, what "being" this archetype looks like.
 */
export function signatureOptionsFor(a: Archetype, limit = 6): SignatureOption[] {
  const dir = archetypeDirection(a);
  const out: SignatureOption[] = [];
  for (const q of choiceQuestions) {
    for (const o of q.options) {
      const v = centredOptionVector(q, o.id);
      if (!v) continue;
      const alignment = Math.round(100 * cosine(v, dir));
      if (alignment >= 60) out.push({ questionId: q.id, prompt: q.prompt, text: o.text, alignment });
    }
  }
  return out.sort((x, y) => y.alignment - x.alignment).slice(0, limit);
}
