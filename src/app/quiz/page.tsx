"use client";

import { useState, useEffect, useCallback } from "react";
import { questions } from "@/lib/quiz-data";
import { calculateScores } from "@/lib/archetypes";
import { validateEmail } from "@/lib/email-validation";
import ArchetypeIcon from "@/components/ArchetypeIcon";
import ScoreBar from "@/components/ScoreBar";
import RadarChart from "@/components/RadarChart";
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
  const [questionVisible, setQuestionVisible] = useState(true);
  const [result, setResult] = useState<QuizResult | null>(null);

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
        setQuestionVisible(false);

        setTimeout(() => {
          setCurrentQuestion((prev) => prev + 1);
          setQuestionVisible(true);
          setTimeout(() => setTransitioning(false), 50);
        }, 350);
      } else {
        const quizResult = calculateScores(newAnswers);
        setResult(quizResult);
        try {
          sessionStorage.setItem("wog_quiz_result", JSON.stringify(quizResult));
        } catch { /* ignore */ }
        setStage("email");
      }
    },
    [answers, currentQuestion, transitioning]
  );

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;

    const validation = validateEmail(email);
    if (!validation.valid) {
      setEmailError(validation.error || "Invalid email.");
      return;
    }

    setEmailSubmitting(true);
    setEmailError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStage("results");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  };

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

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate flex flex-col relative grain">
      {/* Particles */}
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full h-[2px] bg-divider-dark">
        <div className="h-full bg-accent progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2 text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>

        <div className="text-center pb-2">
          <span className="text-[11px] text-text-muted/30 font-[family-name:var(--font-body)] tracking-wider">
            {String(currentQuestion + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-xl mx-auto w-full">
          <div
            className={`w-full transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              questionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h2 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-semibold text-text-primary text-center mb-3 leading-relaxed glow-text">
              {question.question}
            </h2>

            <p className="text-[11px] text-text-muted/40 text-center mb-10 font-[family-name:var(--font-body)] italic max-w-sm mx-auto">
              {question.subtitle}
            </p>

            <div className="space-y-3 stagger-children">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option.scores)}
                  disabled={transitioning}
                  className="w-full text-left p-4 md:p-5 rounded-xl glass option-card cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-[10px] text-accent/60 font-[family-name:var(--font-body)] mt-1 shrink-0 w-4 tracking-wider">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-sm md:text-[15px] text-text-primary/90 font-[family-name:var(--font-body)] leading-relaxed">
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
          <span className="text-[9px] text-text-muted/20 font-[family-name:var(--font-body)] tracking-wider">
            No back button. Choose decisively.
          </span>
        </div>
      </div>
    </main>
  );
}

function EmailGate({
  email, setEmail, honeypot, setHoneypot, emailError, emailSubmitting, onSubmit,
}: {
  email: string; setEmail: (v: string) => void;
  honeypot: string; setHoneypot: (v: string) => void;
  emailError: string; emailSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate flex flex-col items-center justify-center px-6 relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-10 reveal">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>

        <div className="w-12 h-px bg-accent/30 mx-auto mb-10 reveal reveal-delay-1" />

        <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-3 reveal reveal-delay-2 leading-tight">
          Your Power Archetype
          <br />
          <span className="text-text-muted/60">is ready.</span>
        </h2>

        <p className="text-text-muted/50 text-sm mb-10 font-[family-name:var(--font-body)] reveal reveal-delay-3">
          Enter your email to unlock your score and psychological profile.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 reveal reveal-delay-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full glass rounded-xl px-5 py-4 text-text-primary text-sm font-[family-name:var(--font-body)] placeholder:text-text-muted/30 focus:outline-none focus:border-accent/30 transition-all duration-300"
              autoFocus
              required
            />
            {emailError && (
              <p className="text-accent text-xs mt-2 text-left font-[family-name:var(--font-body)]">{emailError}</p>
            )}
          </div>

          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <button
            type="submit"
            disabled={emailSubmitting}
            className="w-full bg-accent hover:bg-accent-light text-white font-semibold text-sm py-4 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] disabled:opacity-60 cursor-pointer glow-accent glow-accent-hover btn-shine"
          >
            {emailSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Reveal My Archetype"
            )}
          </button>
        </form>

        <p className="text-text-muted/20 text-[10px] mt-8 font-[family-name:var(--font-body)] reveal reveal-delay-5">
          No spam. Unsubscribe anytime. Your data stays private.
        </p>
      </div>
    </main>
  );
}

function ResultsPage({ result }: { result: QuizResult }) {
  const [showShareCard, setShowShareCard] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  // Animated score counter
  useEffect(() => {
    const target = result.powerScore;
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => requestAnimationFrame(animate), 600);
    return () => clearTimeout(timeout);
  }, [result.powerScore]);

  const shareText = `My Power Archetype: ${result.archetype.name}. Power Score: ${result.powerScore}/100. Discover yours at`;

  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/[0.02] rounded-full blur-[150px]" />
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-gold/[0.015] rounded-full blur-[120px]" />
      </div>

      {/* Brand */}
      <div className="relative z-10 pt-8 pb-2 text-center reveal">
        <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
          Way of Gods
        </span>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 pb-20">
        {/* Icon + Archetype Name */}
        <div className="text-center pt-8 pb-6">
          <div className="flex justify-center mb-8 reveal reveal-delay-1">
            <div className="icon-draw">
              <ArchetypeIcon icon={result.archetype.icon} size={90} />
            </div>
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-4 font-[family-name:var(--font-body)] reveal reveal-delay-2">
            Your Power Archetype
          </p>

          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold text-text-primary mb-3 reveal reveal-delay-3 glow-text">
            {result.archetype.name}
          </h1>

          <p className="text-text-muted/50 text-sm italic font-[family-name:var(--font-body)] reveal reveal-delay-4">
            {result.archetype.oneLiner}
          </p>
        </div>

        {/* Power Score */}
        <div className="text-center py-10 reveal reveal-delay-5">
          <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-3 font-[family-name:var(--font-body)]">
            Power Score
          </p>
          <p className="font-[family-name:var(--font-heading)] text-8xl md:text-9xl font-bold text-gold glow-gold score-pulse">
            {displayScore}
          </p>
          <p className="text-text-muted/30 text-xs font-[family-name:var(--font-body)] mt-1">out of 100</p>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent mx-auto my-8" />

        {/* Primary Analysis */}
        <div className="reveal reveal-delay-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/50 mb-4 font-[family-name:var(--font-body)] text-center">
            Psychological Profile
          </p>
          <div className="glass rounded-2xl p-6 md:p-8 border-gradient">
            <p className="text-text-primary/90 text-sm md:text-[15px] leading-[1.8] font-[family-name:var(--font-body)]">
              {result.archetype.freeDescription}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Radar Chart */}
        <div className="reveal reveal-delay-7">
          <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-6 text-center font-[family-name:var(--font-body)]">
            Axis Mapping
          </p>
          <div className="glass rounded-2xl p-6 border-gradient">
            <RadarChart
              control={result.axes.control}
              visibility={result.axes.visibility}
              patience={result.axes.patience}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Score Breakdown */}
        <div className="reveal reveal-delay-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-8 text-center font-[family-name:var(--font-body)]">
            Score Breakdown
          </p>
          <ScoreBar label="Control" value={result.axes.control} delay={1200} description="Direct authority vs. influence-based power" />
          <ScoreBar label="Visibility" value={result.axes.visibility} delay={1400} description="Public presence vs. behind-the-scenes operation" />
          <ScoreBar label="Patience" value={result.axes.patience} delay={1600} description="Long-game strategy vs. decisive immediate action" />
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Neural Analysis */}
        <div className="reveal reveal-delay-9">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/50 mb-4 font-[family-name:var(--font-body)] text-center">
            Neural Architecture
          </p>
          <div className="glass rounded-2xl p-6 md:p-8 border-gradient">
            <p className="text-text-muted/70 text-sm leading-[1.8] font-[family-name:var(--font-body)]">
              {result.archetype.deepAnalysis}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Blind Spot */}
        <div className="reveal reveal-delay-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50 mb-4 font-[family-name:var(--font-body)] text-center">
            Critical Blind Spot
          </p>
          <div className="glass rounded-2xl p-6 md:p-8 border-gradient">
            <p className="text-text-muted/70 text-sm leading-[1.8] font-[family-name:var(--font-body)]">
              {result.archetype.blindSpot}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent mx-auto my-10" />

        {/* $3 Paywall */}
        <div className="reveal reveal-delay-12">
          <div className="glass rounded-2xl p-8 md:p-10 border-gradient relative overflow-hidden">
            {/* Subtle glow behind */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px]" />

            <div className="relative">
              <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-[family-name:var(--font-body)] text-center">
                Full Power Profile
              </p>

              <h3 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-2 text-center">
                Go Deeper.
              </h3>

              <p className="text-text-muted/40 text-sm mb-8 text-center font-[family-name:var(--font-body)]">
                The free score is the surface. The full report is the architecture.
              </p>

              <ul className="space-y-4 mb-10">
                {result.archetype.paidTeaser.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-accent/60 text-[10px] mt-1.5 shrink-0">+</span>
                    <span className="text-text-primary/70 text-sm font-[family-name:var(--font-body)] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://gumroad.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-accent hover:bg-accent-light text-white font-semibold text-sm py-4 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent glow-accent-hover btn-shine"
              >
                Unlock Full Report &mdash; $3
              </a>

              <p className="text-text-muted/20 text-[10px] mt-4 text-center font-[family-name:var(--font-body)]">
                Delivered instantly. 5-6 page PDF. Watermarked to your email.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Share */}
        <div className="text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/30 mb-6 font-[family-name:var(--font-body)]">
            Share Your Archetype
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setShowShareCard(true)}
              className="glass glass-hover text-text-primary/70 text-sm px-6 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] cursor-pointer"
            >
              Story Card
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass glass-hover text-text-primary/70 text-sm px-6 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)]"
            >
              Post on X
            </a>
          </div>

          {showShareCard && (
            <ShareCard archetype={result.archetype} powerScore={result.powerScore} onClose={() => setShowShareCard(false)} />
          )}
        </div>

        {/* Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-10" />

        {/* Book CTA */}
        <div className="text-center">
          <p className="text-text-muted/30 text-xs mb-2 font-[family-name:var(--font-body)]">
            The full system behind your score
          </p>
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary/80 mb-5">
            Sovereign: The Architecture of Human Power
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="https://gumroad.com" target="_blank" rel="noopener noreferrer" className="text-accent/70 hover:text-accent text-sm font-semibold transition-colors duration-300 font-[family-name:var(--font-body)]">
              Book I &mdash; $9.99
            </a>
            <span className="w-1 h-1 rounded-full bg-divider-dark" />
            <a href="https://gumroad.com" target="_blank" rel="noopener noreferrer" className="text-accent/70 hover:text-accent text-sm font-semibold transition-colors duration-300 font-[family-name:var(--font-body)]">
              Books I-III &mdash; $27
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-divider-dark text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/20 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>
      </div>
    </main>
  );
}

function ShareCard({
  archetype, powerScore, onClose,
}: {
  archetype: Archetype; powerScore: number; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-6" onClick={onClose}>
      <div className="relative w-full max-w-[320px] reveal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-text-muted/40 hover:text-text-muted text-sm font-[family-name:var(--font-body)] cursor-pointer transition-colors">
          Close
        </button>

        <div className="bg-primary-bg rounded-2xl p-8 flex flex-col items-center aspect-[9/16] justify-center border border-divider-dark relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] via-transparent to-gold/[0.02]" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 icon-draw">
              <ArchetypeIcon icon={archetype.icon} size={64} />
            </div>

            <p className="text-text-muted/40 text-[10px] tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-body)]">
              My Power Archetype
            </p>

            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-5 uppercase tracking-wide glow-text">
              {archetype.name}
            </h2>

            <p className="text-gold font-[family-name:var(--font-heading)] text-xl font-bold glow-gold">
              Power Score: {powerScore}/100
            </p>

            <div className="mt-auto pt-12">
              <p className="text-text-muted/20 text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-body)]">
                @WayOfGods
              </p>
            </div>
          </div>
        </div>

        <p className="text-text-muted/30 text-[10px] mt-4 text-center font-[family-name:var(--font-body)]">
          Screenshot this card and share to your story
        </p>
      </div>
    </div>
  );
}
