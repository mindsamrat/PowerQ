import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-primary-bg text-text-primary relative grain">
      {/* Particles */}
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />

      {/* Subtle radial gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Brand watermark */}
        <div className="pt-10 pb-6 text-center reveal">
          <span className="text-[10px] tracking-[0.4em] uppercase text-text-muted/60 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-3xl mx-auto text-center">
          {/* Top line */}
          <div className="w-full max-w-[200px] mb-12">
            <div className="hero-line mx-auto" />
          </div>

          <p className="text-[11px] tracking-[0.3em] uppercase text-accent/80 mb-6 font-[family-name:var(--font-body)] reveal reveal-delay-1">
            Psychological Power Assessment
          </p>

          <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] mb-6 reveal reveal-delay-2">
            What is your
            <br />
            <span className="text-accent glow-text">Power</span>
            <br />
            <span className="text-text-muted/80">Archetype?</span>
          </h1>

          <div className="w-16 h-px bg-divider-dark mx-auto my-8 reveal reveal-delay-3" />

          <p className="text-text-muted text-sm md:text-base max-w-lg mb-3 font-[family-name:var(--font-body)] leading-relaxed reveal reveal-delay-4">
            15 questions. 3 axes of power. 6 archetypes.
          </p>

          <p className="text-text-muted/60 text-xs md:text-sm max-w-md mb-12 font-[family-name:var(--font-body)] leading-relaxed reveal reveal-delay-5">
            Mapped across neuroscience, behavioral psychology, and game theory.
            Based on the framework behind <em className="text-text-muted/80">Sovereign: The Architecture of Human Power</em>.
          </p>

          <div className="reveal reveal-delay-6">
            <Link
              href="/quiz"
              className="group relative inline-flex items-center gap-3 bg-accent hover:bg-accent-light text-white font-semibold text-sm md:text-base px-10 md:px-14 py-4 md:py-5 rounded-lg transition-all duration-300 font-[family-name:var(--font-body)] tracking-wide glow-accent glow-accent-hover btn-shine"
            >
              Begin The Assessment
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="mt-14 flex items-center gap-8 text-text-muted/40 text-[11px] font-[family-name:var(--font-body)] reveal reveal-delay-7">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent/40 pulse-dot" />
              <span>Free</span>
            </div>
            <span>2 min</span>
            <span>No sign-up to start</span>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pb-8 reveal reveal-delay-8">
          {/* Decorative line */}
          <div className="w-full max-w-[100px] mx-auto mb-6">
            <div className="h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent" />
          </div>

          <div className="flex items-center justify-center gap-6 text-[10px] text-text-muted/30 font-[family-name:var(--font-body)]">
            <Link href="/privacy" className="hover:text-text-muted/60 transition-colors duration-300">
              Privacy
            </Link>
            <span className="w-0.5 h-0.5 rounded-full bg-text-muted/20" />
            <Link href="/terms" className="hover:text-text-muted/60 transition-colors duration-300">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
