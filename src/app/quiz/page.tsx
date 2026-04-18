"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildQuizPlan,
  deltaFromChoice,
  emptyProgress,
  finalize,
  type ChoiceAnswer,
  type FreeTextAnswer,
  type QuizProgress,
} from "@/lib/quiz-engine";
import type { ChoiceQuestion, FreeTextQuestion, OptionId, Question } from "@/data/questions";
import type { FinalResult } from "@/lib/quiz-engine";

const STORAGE_KEY = "pq_progress_v1";
const STORAGE_MAX_AGE_MS = 1000 * 60 * 60 * 48; // 48 hours

interface StoredProgress {
  savedAt: number;
  progress: QuizProgress;
  cursor: number;
}

function loadProgress(): StoredProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProgress;
    if (Date.now() - parsed.savedAt > STORAGE_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress(progress: QuizProgress, cursor: number) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredProgress = { savedAt: Date.now(), progress, cursor };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

function clearProgress() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function QuizPage() {
  const plan = useMemo<Question[]>(() => buildQuizPlan(), []);
  const [cursor, setCursor] = useState(0);
  const [progress, setProgress] = useState<QuizProgress>(emptyProgress);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(true);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.cursor > 0 && saved.cursor < plan.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration on mount
      setProgress(saved.progress);
      setCursor(saved.cursor);
    }
    setHydrated(true);
  }, [plan.length]);

  useEffect(() => {
    if (!hydrated) return;
    if (cursor > 0 && cursor < plan.length) saveProgress(progress, cursor);
  }, [progress, cursor, plan.length, hydrated]);

  const advance = useCallback(
    (nextProgress: QuizProgress) => {
      if (cursor < plan.length - 1) {
        setTransitioning(true);
        setVisible(false);
        window.setTimeout(() => {
          setProgress(nextProgress);
          setCursor((c) => c + 1);
          setVisible(true);
          window.setTimeout(() => setTransitioning(false), 50);
        }, 320);
      } else {
        setProgress(nextProgress);
        const finalResult = finalize(nextProgress);
        setResult(finalResult);
        clearProgress();
        try {
          sessionStorage.setItem("pq_result_v1", JSON.stringify({
            archetypeId: finalResult.match.archetype.id,
            scores: finalResult.scores,
            pq: finalResult.pq,
            freeText: finalResult.freeText,
          }));
        } catch { /* ignore */ }
      }
    },
    [cursor, plan.length]
  );

  const handleChoice = useCallback(
    (question: ChoiceQuestion, optionId: OptionId) => {
      if (transitioning) return;
      const answer: ChoiceAnswer = {
        questionId: question.id,
        optionId,
        delta: deltaFromChoice(question, optionId),
      };
      advance({
        served: [...progress.served, question.id],
        choiceAnswers: [...progress.choiceAnswers, answer],
        freeTextAnswers: progress.freeTextAnswers,
      });
    },
    [advance, progress, transitioning]
  );

  const handleFreeText = useCallback(
    (question: FreeTextQuestion, text: string | null) => {
      if (transitioning) return;
      const answers: FreeTextAnswer[] = text && text.trim().length > 0
        ? [...progress.freeTextAnswers, { questionId: question.id, text: text.trim() }]
        : progress.freeTextAnswers;
      advance({
        served: [...progress.served, question.id],
        choiceAnswers: progress.choiceAnswers,
        freeTextAnswers: answers,
      });
    },
    [advance, progress, transitioning]
  );

  const current = plan[cursor];
  const step = cursor + 1;
  const total = plan.length;
  const progressPct = (step / total) * 100;

  useEffect(() => {
    if (result || !current || current.kind === "free-text") return;
    const map: Record<string, OptionId> = { "1": "a", "2": "b", "3": "c", "4": "d" };
    const handler = (e: KeyboardEvent) => {
      const id = map[e.key];
      if (id) handleChoice(current, id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, handleChoice, result]);

  if (result) {
    return <MinimalResults result={result} />;
  }

  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate flex flex-col relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full h-[2px] bg-divider-dark">
        <div className="h-full bg-accent progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="pt-6 pb-2 text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
            PQ Assessment
          </span>
        </div>

        <div className="text-center pb-2">
          <span className="text-[11px] text-text-muted/30 font-[family-name:var(--font-body)] tracking-wider">
            {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-xl mx-auto w-full pb-6">
          <div
            className={`w-full transition-all duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {current.kind === "free-text" ? (
              <FreeTextStep
                key={current.id}
                question={current}
                disabled={transitioning}
                onSubmit={(text) => handleFreeText(current, text)}
              />
            ) : (
              <ChoiceStep
                key={current.id}
                question={current}
                disabled={transitioning}
                onChoose={(id) => handleChoice(current, id)}
              />
            )}
          </div>
        </div>

        <div className="py-4 text-center">
          <span className="text-[9px] text-text-muted/20 font-[family-name:var(--font-body)] tracking-wider">
            No back button. Choose decisively.
          </span>
        </div>
      </div>
    </main>
  );
}

function ChoiceStep({
  question,
  disabled,
  onChoose,
}: {
  question: ChoiceQuestion;
  disabled: boolean;
  onChoose: (id: OptionId) => void;
}) {
  return (
    <>
      <h2 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-semibold text-text-primary text-center mb-8 leading-relaxed glow-text">
        {question.prompt}
      </h2>
      <div className="space-y-3 stagger-children">
        {question.options.map((option, i) => (
          <button
            key={option.id}
            onClick={() => onChoose(option.id)}
            disabled={disabled}
            className="w-full text-left p-4 md:p-5 rounded-xl glass option-card cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <span className="text-[10px] text-accent/60 font-[family-name:var(--font-body)] mt-1 shrink-0 w-4 tracking-wider">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm md:text-[15px] text-text-primary/90 font-[family-name:var(--font-body)] leading-relaxed">
                {option.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function FreeTextStep({
  question,
  disabled,
  onSubmit,
}: {
  question: FreeTextQuestion;
  disabled: boolean;
  onSubmit: (text: string | null) => void;
}) {
  const [text, setText] = useState("");
  const remaining = question.maxLength - text.length;
  return (
    <>
      <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 text-center mb-4 font-[family-name:var(--font-body)]">
        Optional — personalizes your report
      </p>
      <h2 className="font-[family-name:var(--font-heading)] text-lg md:text-xl font-semibold text-text-primary text-center mb-6 leading-relaxed">
        {question.prompt}
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, question.maxLength))}
        rows={4}
        placeholder="Type here, or skip."
        className="w-full glass rounded-xl px-5 py-4 text-text-primary text-sm font-[family-name:var(--font-body)] placeholder:text-text-muted/30 focus:outline-none resize-none"
        disabled={disabled}
      />
      <p className="text-[10px] text-text-muted/30 mt-2 text-right font-[family-name:var(--font-body)]">
        {remaining} characters
      </p>
      <p className="text-[11px] text-text-muted/40 mt-6 text-center font-[family-name:var(--font-body)] italic">
        {question.usageNote}
      </p>
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={() => onSubmit(null)}
          disabled={disabled}
          className="text-text-muted/50 text-sm px-5 py-3 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)] cursor-pointer hover:text-text-muted"
        >
          Skip
        </button>
        <button
          onClick={() => onSubmit(text)}
          disabled={disabled || text.trim().length === 0}
          className="bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-8 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] cursor-pointer"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function MinimalResults({ result }: { result: FinalResult }) {
  const { match, scores, pq } = result;
  const axes: { label: string; value: number }[] = [
    { label: "Control", value: scores.control },
    { label: "Visibility", value: scores.visibility },
    { label: "Time-Horizon", value: scores.timeHorizon },
    { label: "Power-Source", value: scores.powerSource },
  ];
  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="relative z-10 max-w-lg mx-auto px-6 py-16">
        <div className="text-center mb-10 reveal">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-4 font-[family-name:var(--font-body)]">
            Your Power Archetype
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold text-text-primary mb-3 glow-text">
            {match.archetype.name}
          </h1>
          <p className="text-text-muted/60 text-sm italic font-[family-name:var(--font-body)]">
            {match.archetype.tagline}
          </p>
        </div>

        <div className="text-center py-8 reveal reveal-delay-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 font-[family-name:var(--font-body)]">
            PQ
          </p>
          <p className="font-[family-name:var(--font-heading)] text-7xl font-bold text-gold glow-gold">
            {pq}
          </p>
        </div>

        <div className="space-y-5 glass rounded-2xl p-6 md:p-8 border-gradient reveal reveal-delay-3">
          {axes.map((a) => (
            <div key={a.label}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs tracking-widest uppercase text-text-muted/60 font-[family-name:var(--font-body)]">
                  {a.label}
                </span>
                <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary">
                  {a.value}
                </span>
              </div>
              <div className="h-1 w-full bg-divider-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${a.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <p className="text-text-muted/40 text-xs text-center mt-10 font-[family-name:var(--font-body)] italic">
          Full archetype reveal, rarity, natural enemy, shareable card, and PDF
          report are coming next.
        </p>

        <div className="text-center mt-10">
          <Link
            href="/"
            className="text-text-muted/50 hover:text-text-muted text-sm font-[family-name:var(--font-body)] transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
