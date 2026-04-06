"use client";

import { useState, useEffect, useCallback } from "react";
import { questions } from "@/lib/quiz-data";
import { calculateScores } from "@/lib/archetypes";
import { validateEmail } from "@/lib/email-validation";
import ArchetypeIcon from "@/components/ArchetypeIcon";
import ScoreBar from "@/components/ScoreBar";
import type { Archetype } from "@/lib/archetypes";

type Stage = "quiz" | "email" | "results";

interface QuizResult {
  archetype: Archetype;
  powerScore: number;
  axes: { control: number; visibility: number; patience: number };
}

export default function QuizPage() {
  const [stage, setStage] = useState<Stage>("quiz");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ control: number; visibility: number; patience: number }[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Email gate state
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const handleAnswer = useCallback(
    (scores: { control: number; visibility: number; patience: number }) => {
      if (transitioning) return;

      const newAnswers = [...answers, scores];
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setTransitioning(true);
        setTimeout(() => {
          setCurrentQuestion((prev) => prev + 1);
          setTransitioning(false);
        }, 300);
      } else {
        // Quiz complete, calculate results and show email gate
        const quizResult = calculateScores(newAnswers);
        setResult(quizResult);

        // Store in sessionStorage
        try {
          sessionStorage.setItem(
            "wog_quiz_result",
            JSON.stringify(quizResult)
          );
        } catch {
          // sessionStorage unavailable
        }

        setStage("email");
      }
    },
    [answers, currentQuestion, transitioning]
  );

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) return;

    const validation = validateEmail(email);
    if (!validation.valid) {
      setEmailError(validation.error || "Invalid email.");
      return;
    }

    setEmailSubmitting(true);
    setEmailError("");

    // In production, this would POST to ConvertKit/Brevo API
    // For now, simulate the API call
    try {
      // Simulated API call - replace with actual ConvertKit/Brevo integration
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStage("results");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (stage !== "quiz") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      const index = keyMap[e.key];
      if (index !== undefined && questions[currentQuestion]?.options[index]) {
        handleAnswer(questions[currentQuestion].options[index].scores);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, currentQuestion, handleAnswer]);

  if (stage === "email") {
    return <EmailGate email={email} setEmail={setEmail} honeypot={honeypot} setHoneypot={setHoneypot} emailError={emailError} emailSubmitting={emailSubmitting} onSubmit={handleEmailSubmit} />;
  }

  if (stage === "results" && result) {
    return <ResultsPage result={result} />;
  }

  // Quiz stage
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  return (
    <main className="min-h-screen bg-primary-bg flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-[3px] bg-divider-dark">
        <div
          className="h-full bg-accent progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Brand watermark */}
      <div className="pt-6 pb-2 text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)]">
          Way of Gods
        </span>
      </div>

      {/* Question counter */}
      <div className="text-center pb-4">
        <span className="text-xs text-text-muted font-[family-name:var(--font-body)]">
          {currentQuestion + 1} of {questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-xl mx-auto w-full">
        <div
          className={`w-full transition-all duration-300 ${
            transitioning ? "opacity-0 translate-x-[-30px]" : "opacity-100 translate-x-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-semibold text-text-primary text-center mb-10 leading-relaxed">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option.scores)}
                disabled={transitioning}
                className="w-full text-left p-4 md:p-5 rounded-lg bg-surface border border-divider-dark hover:border-accent/40 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-text-muted font-[family-name:var(--font-body)] mt-0.5 shrink-0 w-5">
                    {String.fromCharCode(65 + index)})
                  </span>
                  <span className="text-sm md:text-base text-text-primary font-[family-name:var(--font-body)] group-hover:text-white transition-colors">
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center">
        <span className="text-[10px] text-text-muted/40 font-[family-name:var(--font-body)]">
          No back button. Choose decisively.
        </span>
      </div>
    </main>
  );
}

// Email Gate Component
function EmailGate({
  email,
  setEmail,
  honeypot,
  setHoneypot,
  emailError,
  emailSubmitting,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  emailError: string;
  emailSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <main className="min-h-screen bg-primary-bg flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>

        <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-4">
          Your Power Archetype
          <br />
          is ready.
        </h2>

        <p className="text-text-muted text-sm mb-8 font-[family-name:var(--font-body)]">
          Enter your email to unlock your score.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              placeholder="your@email.com"
              className="w-full bg-surface border border-divider-dark rounded-lg px-4 py-3.5 text-text-primary text-sm font-[family-name:var(--font-body)] placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              autoFocus
              required
            />
            {emailError && (
              <p className="text-accent text-xs mt-2 text-left font-[family-name:var(--font-body)]">
                {emailError}
              </p>
            )}
          </div>

          {/* Honeypot - hidden from real users */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={emailSubmitting}
            className="w-full bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 rounded-lg transition-colors duration-200 font-[family-name:var(--font-body)] disabled:opacity-60 cursor-pointer"
          >
            {emailSubmitting ? "Unlocking..." : "Reveal My Archetype"}
          </button>
        </form>

        <p className="text-text-muted/40 text-[11px] mt-6 font-[family-name:var(--font-body)]">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </main>
  );
}

// Results Page Component
function ResultsPage({ result }: { result: QuizResult }) {
  const [showShareCard, setShowShareCard] = useState(false);

  const shareText = `My Power Archetype: ${result.archetype.name}. Power Score: ${result.powerScore}/100. Discover yours at`;

  return (
    <main className="min-h-screen bg-primary-bg">
      {/* Brand watermark */}
      <div className="pt-8 pb-2 text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)]">
          Way of Gods
        </span>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-16">
        {/* Archetype Icon & Name */}
        <div className="text-center pt-8 pb-6 fade-in-up">
          <div className="flex justify-center mb-6">
            <ArchetypeIcon icon={result.archetype.icon} size={80} />
          </div>
          <p className="text-text-muted text-xs tracking-widest uppercase mb-3 font-[family-name:var(--font-body)]">
            Your Power Archetype
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-2">
            {result.archetype.name}
          </h1>
          <p className="text-text-muted text-sm italic font-[family-name:var(--font-body)]">
            {result.archetype.oneLiner}
          </p>
        </div>

        {/* Power Score */}
        <div className="text-center py-8 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-text-muted text-xs tracking-widest uppercase mb-2 font-[family-name:var(--font-body)]">
            Power Score
          </p>
          <p className="font-[family-name:var(--font-heading)] text-7xl md:text-8xl font-bold text-gold">
            {result.powerScore}
          </p>
          <p className="text-text-muted text-sm font-[family-name:var(--font-body)]">out of 100</p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-divider-dark mx-auto my-6" />

        {/* Free Description */}
        <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
          <p className="text-text-primary text-sm md:text-base leading-relaxed font-[family-name:var(--font-body)] text-center">
            {result.archetype.freeDescription}
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-divider-dark mx-auto my-8" />

        {/* Axis Breakdown */}
        <div className="fade-in-up" style={{ animationDelay: "0.6s" }}>
          <p className="text-text-muted text-xs tracking-widest uppercase mb-6 text-center font-[family-name:var(--font-body)]">
            Score Breakdown
          </p>
          <ScoreBar label="Control" value={result.axes.control} delay={800} />
          <ScoreBar label="Visibility" value={result.axes.visibility} delay={1000} />
          <ScoreBar label="Patience" value={result.axes.patience} delay={1200} />
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-divider-dark mx-auto my-8" />

        {/* $3 Paywall Upsell */}
        <div className="bg-secondary-bg border border-divider-dark rounded-xl p-6 md:p-8 fade-in-up" style={{ animationDelay: "0.8s" }}>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-text-primary mb-2 text-center">
            Unlock Your Full Power Profile
          </h3>
          <p className="text-text-muted text-sm mb-6 text-center font-[family-name:var(--font-body)]">
            The free score is the surface. The full report is the system.
          </p>

          <ul className="space-y-3 mb-8">
            {result.archetype.paidTeaser.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-accent text-sm mt-0.5 shrink-0">+</span>
                <span className="text-text-primary text-sm font-[family-name:var(--font-body)]">{item}</span>
              </li>
            ))}
          </ul>

          <a
            href="https://gumroad.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 rounded-lg transition-colors duration-200 font-[family-name:var(--font-body)]"
          >
            Unlock Full Report &mdash; $3
          </a>

          <p className="text-text-muted/40 text-[11px] mt-4 text-center font-[family-name:var(--font-body)]">
            Delivered instantly via email. 5-6 page PDF.
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-divider-dark mx-auto my-8" />

        {/* Share Section */}
        <div className="text-center fade-in-up" style={{ animationDelay: "1s" }}>
          <p className="text-text-muted text-xs tracking-widest uppercase mb-4 font-[family-name:var(--font-body)]">
            Share Your Archetype
          </p>

          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setShowShareCard(true)}
              className="bg-surface border border-divider-dark hover:border-accent/40 text-text-primary text-sm px-5 py-2.5 rounded-lg transition-colors font-[family-name:var(--font-body)] cursor-pointer"
            >
              Story Card
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface border border-divider-dark hover:border-accent/40 text-text-primary text-sm px-5 py-2.5 rounded-lg transition-colors font-[family-name:var(--font-body)]"
            >
              Post on X
            </a>
          </div>

          {showShareCard && (
            <ShareCard
              archetype={result.archetype}
              powerScore={result.powerScore}
              onClose={() => setShowShareCard(false)}
            />
          )}
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-divider-dark mx-auto my-8" />

        {/* Sovereign Book CTA */}
        <div className="text-center fade-in-up" style={{ animationDelay: "1.2s" }}>
          <p className="text-text-muted text-sm mb-3 font-[family-name:var(--font-body)]">
            The full system behind your score
          </p>
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary mb-4">
            Sovereign: The Architecture of Human Power
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://gumroad.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-light text-sm font-semibold transition-colors font-[family-name:var(--font-body)]"
            >
              Book I &mdash; $9.99
            </a>
            <span className="w-1 h-1 rounded-full bg-divider-dark" />
            <a
              href="https://gumroad.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-light text-sm font-semibold transition-colors font-[family-name:var(--font-body)]"
            >
              Books I-III Bundle &mdash; $27
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-divider-dark text-center">
          <span className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>
      </div>
    </main>
  );
}

// Share Card Modal
function ShareCard({
  archetype,
  powerScore,
  onClose,
}: {
  archetype: Archetype;
  powerScore: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6" onClick={onClose}>
      <div
        className="relative w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-text-muted hover:text-text-primary text-sm font-[family-name:var(--font-body)] cursor-pointer"
        >
          Close
        </button>

        {/* Card */}
        <div className="bg-primary-bg rounded-2xl p-8 flex flex-col items-center aspect-[9/16] justify-center border border-divider-dark">
          <div className="mb-6">
            <ArchetypeIcon icon={archetype.icon} size={64} />
          </div>

          <p className="text-text-muted text-[11px] tracking-widest uppercase mb-3 font-[family-name:var(--font-body)]">
            My Power Archetype
          </p>

          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-4 uppercase tracking-wide">
            {archetype.name}
          </h2>

          <p className="text-gold font-[family-name:var(--font-heading)] text-lg font-bold mb-8">
            Power Score: {powerScore}/100
          </p>

          <div className="mt-auto">
            <p className="text-text-muted/40 text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)]">
              @WayOfGods
            </p>
          </div>
        </div>

        <p className="text-text-muted text-[11px] mt-4 text-center font-[family-name:var(--font-body)]">
          Screenshot this card and share it to your story
        </p>
      </div>
    </div>
  );
}
