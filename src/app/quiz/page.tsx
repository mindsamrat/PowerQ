"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildQuizPlan,
  deltaFromChoice,
  emptyProgress,
  finalize,
  nextServableCursor,
  progressInfo,
  type ChoiceAnswer,
  type FreeTextAnswer,
  type QuizProgress,
} from "@/lib/quiz-engine";
import { QUIZ_BANK_VERSION, type ChoiceQuestion, type EmailQuestion, type FreeTextQuestion, type OptionId, type Question } from "@/data/questions";
import {
  PROGRESS_KEY,
  RETENTION_MS,
  clearPending,
  readAttribution,
  resultSignature,
  writePending,
  writeSession,
  type StoredAnswer,
} from "@/lib/client-session";
import { FREE_TEXT_MAX, NAME_MAX, sanitizeName, truncateCodePoints } from "@/lib/sanitize";
import { suggestEmail } from "@/lib/email-suggest";

/** The server waits up to 30 s (DNS checks, database). Give it that, then move on. */
const SUBMIT_TIMEOUT_MS = 25_000;

interface SubscribeResponse {
  ok?: boolean;
  degraded?: boolean;
  limited?: boolean;
  responseId?: string | null;
  error?: string;
  result?: {
    archetypeId?: string;
    scores?: { control?: number; visibility?: number; timeHorizon?: number; powerSource?: number };
    pq?: number;
  } | null;
}

interface StoredProgress {
  savedAt: number;
  bankVersion: number;
  progress: QuizProgress;
  cursor: number;
  /** Per-session shuffle seed so a resumed quiz shows options in the same order. */
  seed: number;
}

function loadProgress(): StoredProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    const stale =
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > RETENTION_MS ||
      parsed.bankVersion !== QUIZ_BANK_VERSION ||
      !parsed.progress ||
      !Array.isArray(parsed.progress.served) ||
      !Array.isArray(parsed.progress.choiceAnswers) ||
      !Array.isArray(parsed.progress.freeTextAnswers) ||
      typeof parsed.cursor !== "number" ||
      typeof parsed.seed !== "number";
    if (stale) {
      localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    return parsed as StoredProgress;
  } catch {
    return null;
  }
}

function saveProgress(progress: QuizProgress, cursor: number, seed: number) {
  try {
    const payload: StoredProgress = { savedAt: Date.now(), bankVersion: QUIZ_BANK_VERSION, progress, cursor, seed };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
  } catch { /* storage full or blocked: the quiz still works, it just won't resume */ }
}

function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
}

// ---------- Option-order randomisation ----------
//
// People pick the first option more often than chance (position bias), so the
// display order of each question's four options is shuffled per session. The
// shuffle is deterministic from (seed, questionId), so resuming a saved quiz
// shows the same order. Scoring uses option ids and is unaffected; the
// displayed position is recorded so the bias can be measured later.

function newSeed(): number {
  return ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1;
}

function hashSeed(seed: number, key: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** Returns option indices in display order. Seed 0 = bank order (pre-hydration). */
function optionOrder(seed: number, questionId: string): number[] {
  const arr = [0, 1, 2, 3];
  if (!seed) return arr;
  let s = hashSeed(seed, questionId);
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const OPTION_KEYS: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export default function QuizPage() {
  const router = useRouter();
  const plan = useMemo<Question[]>(() => buildQuizPlan(), []);
  const [cursor, setCursor] = useState(0);
  const [progress, setProgress] = useState<QuizProgress>(emptyProgress);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  // 0 until hydration so server and client render identical markup; a real
  // seed is chosen (or restored) on the client before the first question shows.
  const [seed, setSeed] = useState(0);
  // State updates are asynchronous, so a fast double tap (or key + tap) can
  // get through `transitioning`. The ref flips synchronously.
  const busyRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.cursor > 0 && saved.cursor < plan.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration on mount
      setProgress(saved.progress);
      setCursor(saved.cursor);
      setSeed(saved.seed);
    } else {
      setSeed(newSeed());
    }
    setHydrated(true);
  }, [plan.length]);

  useEffect(() => {
    if (!hydrated) return;
    if (cursor > 0 && cursor < plan.length) saveProgress(progress, cursor, seed);
  }, [progress, cursor, plan.length, hydrated, seed]);

  // Each new step is a new page for a screen reader: move focus to its heading.
  useEffect(() => {
    if (!hydrated || !visible) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [cursor, hydrated, visible]);

  const advance = useCallback(
    (nextProgress: QuizProgress) => {
      // Adaptive: pick the next question that actually needs to be served.
      // Right now this skips the tiebreaker block when the interim archetype
      // match has a clear gap to the runner-up.
      const candidate = nextServableCursor(cursor + 1, plan, nextProgress);
      busyRef.current = true;
      setTransitioning(true);
      setVisible(false);
      window.setTimeout(() => {
        setProgress(nextProgress);
        setCursor(Math.min(candidate, plan.length - 1));
        setVisible(true);
        window.setTimeout(() => {
          setTransitioning(false);
          busyRef.current = false;
        }, 50);
      }, 320);
    },
    [cursor, plan]
  );

  const handleChoice = useCallback(
    (question: ChoiceQuestion, optionId: OptionId, pos?: number) => {
      if (busyRef.current || transitioning) return;
      const answer: ChoiceAnswer = {
        questionId: question.id,
        optionId,
        delta: deltaFromChoice(question, optionId),
        ...(pos !== undefined ? { pos } : {}),
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
      if (busyRef.current || transitioning) return;
      const clean = text ? truncateCodePoints(text.trim(), FREE_TEXT_MAX).trim() : "";
      const answers: FreeTextAnswer[] = clean.length > 0
        ? [...progress.freeTextAnswers, { questionId: question.id, text: clean }]
        : progress.freeTextAnswers;
      advance({
        served: [...progress.served, question.id],
        choiceAnswers: progress.choiceAnswers,
        freeTextAnswers: answers,
      });
    },
    [advance, progress, transitioning]
  );

  const submitEmail = useCallback(
    async (fields: EmailFields): Promise<{ ok: boolean; error?: string }> => {
      if (busyRef.current) return { ok: false, error: "Hold on — still working on the last step." };
      busyRef.current = true;
      try {
        const finalResult = finalize(progress);
        const answers: StoredAnswer[] = progress.choiceAnswers.map((a) => ({ q: a.questionId, o: a.optionId, d: a.delta, pos: a.pos }));
        const payload = {
          name: fields.name,
          email: fields.email,
          answers,
          freeText: progress.freeTextAnswers,
          marketingConsent: fields.marketingConsent,
          attribution: readAttribution(),
          website: fields.website,
          source: "free-pdf" as const,
        };

        // Three outcomes worth telling apart:
        //   ok          - the server answered (saved, limited, or degraded)
        //   rejected    - the user must change something (bad name/email)
        //   unavailable - our side is down or slow; their answers are still valid
        let outcome: { status: "ok" | "rejected" | "unavailable"; body?: SubscribeResponse; error?: string };
        try {
          const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
          });
          const body = (await res.json().catch(() => ({}))) as SubscribeResponse;
          if (res.ok) outcome = { status: "ok", body };
          else if (res.status === 400) outcome = { status: "rejected", error: body.error };
          else outcome = { status: "unavailable" };
        } catch {
          outcome = { status: "unavailable" };
        }

        if (outcome.status === "rejected") {
          return { ok: false, error: outcome.error ?? "Please check your name and email and try again." };
        }

        // From here we always show the result. The scores were computed on this
        // device from the same question bank the server uses, so they are correct
        // whether or not the save succeeded. Prefer the server's echo so the URL
        // matches the stored row exactly.
        const body = outcome.body ?? {};
        const responseId = typeof body.responseId === "string" && body.responseId.length > 0 ? body.responseId : null;
        const limited = outcome.status === "ok" && body.limited === true;
        const serverResult = body.result ?? null;
        const archetypeId = serverResult?.archetypeId ?? finalResult.match.archetype.id;
        const control = serverResult?.scores?.control ?? finalResult.scores.control;
        const visibility = serverResult?.scores?.visibility ?? finalResult.scores.visibility;
        const timeHorizon = serverResult?.scores?.timeHorizon ?? finalResult.scores.timeHorizon;
        const powerSource = serverResult?.scores?.powerSource ?? finalResult.scores.powerSource;
        const pq = serverResult?.pq ?? finalResult.pq;

        // The results page recomputes this signature from the URL below, so
        // the session can only ever be used with this exact result.
        const sig = resultSignature({ archetypeId, control, visibility, timeHorizon, powerSource, pq });
        writeSession({ id: responseId, sig, archetypeId, answers, savedAt: Date.now(), limited: limited || undefined });
        if (responseId || limited) {
          clearPending();
        } else {
          // Queue the submission so the results page can retry in the
          // background. Nothing is lost if the database wakes up shortly.
          writePending(sig, payload);
        }
        clearProgress();

        const qs = new URLSearchParams({
          id: archetypeId,
          c: String(control),
          v: String(visibility),
          t: String(timeHorizon),
          p: String(powerSource),
          pq: String(pq),
        });
        router.push(`/results?${qs.toString()}`);
        return { ok: true };
      } finally {
        busyRef.current = false;
      }
    },
    [progress, router]
  );

  const current = plan[Math.min(cursor, plan.length - 1)];
  const info = progressInfo(cursor, plan, progress);

  useEffect(() => {
    if (!hydrated || !current || current.kind === "free-text" || current.kind === "email") return;
    const order = optionOrder(seed, current.id);
    const handler = (e: KeyboardEvent) => {
      // Not while typing, not on auto-repeat, and never on Ctrl/Cmd/Alt+key
      // (switching browser tabs must not answer a question).
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const displayIndex = OPTION_KEYS[e.key.toLowerCase()];
      if (displayIndex === undefined) return;
      e.preventDefault();
      handleChoice(current, current.options[order[displayIndex]].id, displayIndex);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, handleChoice, hydrated, seed]);

  const stepLabel = !hydrated
    ? " "
    : info.kind === "choice"
      ? `Question ${info.questionNumber} of ${info.questionTotal}`
      : info.kind === "free-text"
        ? "Optional"
        : "Final step";

  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate flex flex-col relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[120px]" />
      </div>

      <div
        className="relative z-10 w-full h-[2px] bg-divider-dark"
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hydrated ? Math.round(info.fraction * 100) : 0}
      >
        <div className="h-full bg-accent progress-fill" style={{ width: `${hydrated ? info.fraction * 100 : 0}%` }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col" aria-busy={!hydrated}>
        <div className="pt-6 pb-2 text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted font-[family-name:var(--font-body)]">
            PQ Assessment
          </span>
        </div>

        <div className="text-center pb-2">
          <span className="text-[11px] text-text-muted font-[family-name:var(--font-body)] tracking-wider" aria-live="polite">
            {stepLabel}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-xl mx-auto w-full pb-6">
          <div
            className={`w-full transition-all duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              visible && hydrated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {!hydrated ? (
              <StepSkeleton />
            ) : current.kind === "free-text" ? (
              <FreeTextStep
                key={current.id}
                question={current}
                headingRef={headingRef}
                disabled={transitioning}
                onSubmit={(text) => handleFreeText(current, text)}
              />
            ) : current.kind === "email" ? (
              <EmailStep
                key={current.id}
                question={current}
                headingRef={headingRef}
                onSubmit={submitEmail}
              />
            ) : (
              <ChoiceStep
                key={current.id}
                question={current}
                headingRef={headingRef}
                order={optionOrder(seed, current.id)}
                disabled={transitioning}
                onChoose={(id, pos) => handleChoice(current, id, pos)}
              />
            )}
          </div>
        </div>

        <div className="py-4 text-center">
          <span className="text-[9px] text-text-muted font-[family-name:var(--font-body)] tracking-wider">
            No back button. Choose decisively.
          </span>
        </div>
      </div>
    </main>
  );
}

/** Same footprint as a question, so nothing jumps when the real step appears. */
function StepSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-7 rounded-md bg-white/[0.04] mx-auto w-3/4 mb-8" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[62px] rounded-xl glass" />)}
      </div>
    </div>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

const HEADING_CLASS =
  "font-[family-name:var(--font-heading)] text-xl md:text-2xl font-semibold text-text-primary text-center leading-relaxed outline-none";
const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-bg";
const FIELD_CLASS = `w-full glass rounded-xl px-5 py-4 text-text-primary text-sm md:text-base font-[family-name:var(--font-body)] placeholder:text-text-muted focus:outline-none ${FOCUS_RING} aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent/70`;
const LABEL_CLASS = "block text-[10px] tracking-[0.25em] uppercase text-text-muted mb-2 font-[family-name:var(--font-body)]";

function ChoiceStep({
  question,
  order,
  disabled,
  headingRef,
  onChoose,
}: {
  question: ChoiceQuestion;
  /** Indices into question.options, in display order. */
  order: number[];
  disabled: boolean;
  headingRef: HeadingRef;
  onChoose: (id: OptionId, pos: number) => void;
}) {
  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className={`${HEADING_CLASS} mb-8 glow-text`}>
        {question.prompt}
      </h1>
      <div className="space-y-3 stagger-children" role="group" aria-label="Answer options">
        {order.map((optionIndex, pos) => {
          const option = question.options[optionIndex];
          const letter = String.fromCharCode(65 + pos);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChoose(option.id, pos)}
              disabled={disabled}
              aria-label={`${letter}. ${option.text}`}
              className={`w-full text-left p-4 md:p-5 rounded-xl glass option-card cursor-pointer outline-none ${FOCUS_RING}`}
            >
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="text-[10px] text-accent-light font-[family-name:var(--font-body)] mt-1 shrink-0 w-4 tracking-wider">
                  {letter}
                </span>
                <span className="text-sm md:text-[15px] text-text-primary/90 font-[family-name:var(--font-body)] leading-relaxed">
                  {option.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="sr-only">Keyboard: press 1 to 4, or A to D, to choose.</p>
    </>
  );
}

interface EmailFields {
  name: string;
  email: string;
  marketingConsent: boolean;
  /** Honeypot. Real people never see the field, so it stays empty. */
  website: string;
}

function EmailStep({
  question,
  headingRef,
  onSubmit,
}: {
  question: EmailQuestion;
  headingRef: HeadingRef;
  onSubmit: (fields: EmailFields) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const suggestion = useMemo(() => suggestEmail(email), [email]);
  const cleanName = sanitizeName(name);
  const emailLooksComplete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    // The server applies the same rule; catching it here saves a round trip
    // and a confusing bounce after 27 questions.
    if (cleanName.length === 0) {
      setError("Please enter your first name — letters only, no @ handles or links.");
      return;
    }
    if (!emailLooksComplete) {
      setError("That doesn't look like a complete email address.");
      return;
    }
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit({ name: cleanName, email: email.trim(), marketingConsent: consent, website });
      if (!result.ok) setError(result.error ?? "Something went wrong. Please try again.");
    } finally {
      // On success the page navigates away; on failure the button must come back.
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <p className="text-[10px] tracking-[0.3em] uppercase text-accent-light text-center mb-4 font-[family-name:var(--font-body)]">
        Final Step — Required
      </p>
      <h1 ref={headingRef} tabIndex={-1} className={`${HEADING_CLASS} mb-3`}>
        {question.prompt}
      </h1>
      <p className="text-text-muted text-xs md:text-sm text-center mb-8 font-[family-name:var(--font-body)] italic max-w-sm mx-auto">
        {question.subPrompt}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="pq-name" className={LABEL_CLASS}>{question.namePrompt}</label>
          <input
            id="pq-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
            autoComplete="given-name"
            required
            autoFocus
            maxLength={NAME_MAX}
            disabled={submitting}
            aria-invalid={error !== null && cleanName.length === 0 ? true : undefined}
            aria-describedby="pq-form-error"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="pq-email" className={LABEL_CLASS}>{question.emailPrompt}</label>
          <input
            id="pq-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={254}
            disabled={submitting}
            aria-invalid={error !== null && !emailLooksComplete ? true : undefined}
            aria-describedby="pq-email-hint pq-form-error"
            className={FIELD_CLASS}
          />
          <p id="pq-email-hint" className="text-xs text-text-muted mt-2 font-[family-name:var(--font-body)] min-h-[1rem]" aria-live="polite">
            {suggestion ? (
              <>
                Did you mean{" "}
                <button
                  type="button"
                  onClick={() => setEmail(suggestion)}
                  className={`text-gold-light underline underline-offset-2 cursor-pointer rounded ${FOCUS_RING}`}
                >
                  {suggestion}
                </button>
                ?
              </>
            ) : null}
          </p>
        </div>

        {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
          <label htmlFor="pq-website">Website</label>
          <input id="pq-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-text">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
            className={`mt-0.5 h-4 w-4 shrink-0 accent-[#C41E3A] rounded ${FOCUS_RING}`}
          />
          <span className="text-xs text-text-muted font-[family-name:var(--font-body)] leading-relaxed">
            Email me occasional notes from Way of Gods. Unsubscribe anytime.
          </span>
        </label>

        <p id="pq-form-error" role="alert" aria-live="assertive" className="text-accent-light text-xs font-[family-name:var(--font-body)] text-center min-h-[1rem]">
          {error}
        </p>

        <button
          type="submit"
          disabled={submitting || name.trim().length < 1 || email.trim().length < 5}
          className={`bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-4 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] cursor-pointer glow-accent btn-shine outline-none ${FOCUS_RING}`}
        >
          {submitting ? "Analyzing…" : "Reveal My Archetype"}
        </button>
      </form>
      <p className="text-text-muted text-[11px] mt-6 text-center font-[family-name:var(--font-body)] leading-relaxed">
        Your name and email are stored with your answers so your report can be prepared. No marketing emails unless you tick the box.
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-text-primary">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-text-primary">Privacy Policy</Link>. You must be 16 or older.
      </p>
    </>
  );
}

function FreeTextStep({
  question,
  disabled,
  headingRef,
  onSubmit,
}: {
  question: FreeTextQuestion;
  disabled: boolean;
  headingRef: HeadingRef;
  onSubmit: (text: string | null) => void;
}) {
  const [text, setText] = useState("");
  const max = Math.min(question.maxLength, FREE_TEXT_MAX);
  // Count characters the way people do (one emoji = one), never half a pair.
  const used = Array.from(text).length;
  const remaining = max - used;
  const fieldId = `pq-free-${question.id}`;
  return (
    <>
      <p className="text-[10px] tracking-[0.3em] uppercase text-accent-light text-center mb-4 font-[family-name:var(--font-body)]">
        Optional — personalizes your report
      </p>
      <h1 ref={headingRef} tabIndex={-1} className={`${HEADING_CLASS} text-lg md:text-xl mb-6`}>
        <label htmlFor={fieldId}>{question.prompt}</label>
      </h1>
      <textarea
        id={fieldId}
        value={text}
        onChange={(e) => setText(truncateCodePoints(e.target.value, max))}
        rows={4}
        placeholder="Type here, or skip."
        aria-describedby={`${fieldId}-count ${fieldId}-note`}
        className={`${FIELD_CLASS} resize-none`}
        disabled={disabled}
      />
      <p id={`${fieldId}-count`} className="text-[10px] text-text-muted mt-2 text-right font-[family-name:var(--font-body)]">
        {remaining} characters left
      </p>
      <p id={`${fieldId}-note`} className="text-[11px] text-text-muted mt-6 text-center font-[family-name:var(--font-body)] italic">
        {question.usageNote}
      </p>
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={() => onSubmit(null)}
          disabled={disabled}
          className={`text-text-muted text-sm px-5 py-3 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)] cursor-pointer hover:text-text-primary outline-none ${FOCUS_RING}`}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => onSubmit(text)}
          disabled={disabled || text.trim().length === 0}
          className={`bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-8 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] cursor-pointer outline-none ${FOCUS_RING}`}
        >
          Continue
        </button>
      </div>
    </>
  );
}
