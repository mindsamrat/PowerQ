import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-landing-bg text-text-on-light flex flex-col">
      {/* Brand watermark */}
      <div className="pt-8 pb-4 text-center">
        <span className="text-[10px] tracking-[0.3em] uppercase text-text-muted-light font-[family-name:var(--font-body)]">
          Way of Gods
        </span>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl font-bold leading-tight mb-6 text-text-on-light">
          What is your
          <br />
          <span className="text-accent">Power Archetype</span>?
        </h1>

        <p className="text-text-muted-light text-base md:text-lg max-w-md mb-4 font-[family-name:var(--font-body)]">
          15 questions. 3 axes of power. 6 archetypes.
        </p>

        <p className="text-text-muted-light text-sm max-w-md mb-10 font-[family-name:var(--font-body)]">
          Most people think they understand power. This assessment will show you
          how you actually wield it. Based on the same psychological framework
          behind <em>Sovereign: The Architecture of Human Power</em>.
        </p>

        <Link
          href="/quiz"
          className="inline-block bg-accent hover:bg-accent-light text-white font-semibold text-base px-10 py-4 rounded transition-colors duration-200 font-[family-name:var(--font-body)] tracking-wide"
        >
          Begin The Assessment
        </Link>

        <div className="mt-12 flex items-center gap-6 text-text-muted-light text-xs font-[family-name:var(--font-body)]">
          <span>Free</span>
          <span className="w-1 h-1 rounded-full bg-divider-light" />
          <span>2 minutes</span>
          <span className="w-1 h-1 rounded-full bg-divider-light" />
          <span>No sign-up required</span>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted-light font-[family-name:var(--font-body)]">
          <Link href="/privacy" className="hover:text-text-on-light transition-colors">
            Privacy
          </Link>
          <span className="w-0.5 h-0.5 rounded-full bg-divider-light" />
          <Link href="/terms" className="hover:text-text-on-light transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}
