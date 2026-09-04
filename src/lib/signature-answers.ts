import { questions } from "@/data/questions";
import { getCentroid, type Archetype, type AxisId } from "@/data/archetypes";
import type { AxisScores } from "@/lib/scoring";

export interface StoredAnswer {
  q: string;
  o: string;
  d: AxisScores;
}

export interface SignatureAnswer {
  questionId: string;
  optionId: string;
  prompt: string;
  optionText: string;
  /** How strongly this choice pointed toward the archetype (0–100, cosine × 100). */
  pullScore: number;
}

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

/**
 * The three answers that pointed most strongly toward the archetype.
 *
 * Each option's delta is centred within its own question (same convention as
 * the scorer), then compared by direction with the archetype's direction from
 * neutral. This means "pull" is comparable across questions regardless of how
 * large a question's deltas happen to be.
 */
export function computeSignatureAnswers(
  archetype: Archetype,
  answers: StoredAnswer[]
): SignatureAnswer[] {
  const c = getCentroid(archetype);
  const dir = AXES.map((ax) => c[ax] - 50);
  const dirNorm = Math.hypot(...dir) || 1;

  const scored = answers
    .map((a) => {
      const q = questions.find((qq) => qq.id === a.q);
      if (!q || q.kind === "free-text" || q.kind === "email") return null;
      const option = q.options.find((o) => o.id === a.o);
      if (!option) return null;
      const centred = AXES.map((ax) => {
        const vals = q.options.map((o) => o.scores[ax] ?? 0);
        return (a.d[ax] ?? 0) - (Math.min(...vals) + Math.max(...vals)) / 2;
      });
      const n = Math.hypot(...centred);
      const cos = n === 0 ? 0 : centred.reduce((s, v, i) => s + v * dir[i], 0) / (n * dirNorm);
      return {
        questionId: a.q,
        optionId: a.o,
        prompt: q.prompt,
        optionText: option.text,
        pullScore: Math.round(100 * cos),
      };
    })
    .filter((x): x is SignatureAnswer => x !== null);

  return scored.sort((x, y) => y.pullScore - x.pullScore).slice(0, 3);
}
