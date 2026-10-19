import type { Metadata } from "next";
import Link from "next/link";
import ArchetypeOrbital from "@/components/ArchetypeOrbital";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Landing page. Rendered on the server with no JavaScript required: the hero,
 * the CTA and the copy are in the HTML at full opacity, and the entrance is a
 * CSS-only animation (see .reveal in globals.css) that reduced-motion users
 * never see. Only the archetype map is a client component.
 */
export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#080808] overflow-x-hidden text-white">
      <div className="relative z-20 flex flex-col">
        {/* Top bar */}
        <div className="pt-10 pb-4 text-center reveal">
          <a
            href="https://wayofgods.com"
            className="text-[10px] tracking-[0.5em] uppercase font-[family-name:var(--font-body)] transition-colors duration-300 text-text-muted hover:text-white"
          >
            Way of Gods
          </a>
        </div>

        {/* Hero */}
        <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-6 text-center">
          <div className="reveal reveal-delay-1">
            <span
              className="inline-block text-[10px] tracking-[0.35em] uppercase mb-8 font-[family-name:var(--font-body)] px-4 py-2 rounded-full border"
              style={{
                color: "#E8526A",
                borderColor: "rgba(196,30,58,0.3)",
                background: "rgba(196,30,58,0.06)",
                backdropFilter: "blur(10px)",
              }}
            >
              Psychological Power Assessment
            </span>
          </div>

          <div className="reveal reveal-delay-2">
            <h1
              className="font-[family-name:var(--font-heading)] font-bold leading-[1.05]"
              style={{
                fontSize: "clamp(3rem, 10vw, 8rem)",
                textShadow: "0 0 80px rgba(196,30,58,0.15)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.95)" }}>What is</span>
              <br />
              <span style={{ color: "rgba(255,255,255,0.95)" }}>your </span>
              <span
                style={{
                  color: "#C41E3A",
                  textShadow: "0 0 40px rgba(196,30,58,0.5), 0 0 80px rgba(196,30,58,0.2)",
                }}
              >
                Power
              </span>
              <br />
              <span className="italic" style={{ color: "rgba(255,255,255,0.55)" }}>
                Archetype?
              </span>
            </h1>
          </div>

          <div className="reveal reveal-delay-3">
            <div
              className="w-24 h-px my-10 mx-auto"
              style={{ background: "linear-gradient(90deg, transparent, rgba(196,30,58,0.4), transparent)" }}
            />
          </div>

          <div className="reveal reveal-delay-4">
            <p className="text-sm md:text-base max-w-md mx-auto mb-3 font-[family-name:var(--font-body)] leading-relaxed text-white/70">
              27 questions. 4 axes of power. 8 archetypes.
            </p>
            <p className="text-xs md:text-sm max-w-xs mx-auto mb-14 font-[family-name:var(--font-body)] leading-relaxed text-text-muted">
              Mapped across neuroscience, behavioral psychology, and game theory.
            </p>
          </div>

          <div className="reveal reveal-delay-5">
            <Link
              href="/quiz"
              className="hero-cta group relative inline-flex items-center gap-3 font-semibold text-sm md:text-base tracking-wide font-[family-name:var(--font-body)] overflow-hidden text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
            >
              <span className="hero-cta-sheen absolute inset-0 pointer-events-none" aria-hidden="true" />
              <span className="relative z-10">Begin The Assessment</span>
              <svg
                className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex items-center gap-8 md:gap-12 reveal reveal-delay-6">
            {[
              { value: "27", label: "Questions" },
              { value: "4", label: "Power Axes" },
              { value: "8", label: "Archetypes" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="font-[family-name:var(--font-heading)] font-bold mb-1"
                  style={{
                    fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                    color: "rgba(201,168,76,0.9)",
                    textShadow: "0 0 20px rgba(201,168,76,0.3)",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-body)] text-text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* The 8 Archetypes — Orbital */}
        <section id="archetypes" className="pt-12 pb-4 reveal reveal-delay-7" aria-labelledby="map-heading">
          <div className="text-center px-6 mb-4">
            <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.9)" }}>
              The Eight Archetypes
            </p>
            <h2 id="map-heading" className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-white/95 mt-3 mb-3" style={{ lineHeight: 1.1 }}>
              Map of Power
            </h2>
            <p className="text-sm md:text-base text-text-muted font-[family-name:var(--font-body)] max-w-md mx-auto italic">
              Open any archetype to see its signature and its natural enemy.
            </p>
          </div>
          <ArchetypeOrbital />
          <div className="text-center mt-2 mb-6">
            <Link
              href="/archetypes"
              className="inline-block text-xs tracking-[0.2em] uppercase font-[family-name:var(--font-body)] transition-colors duration-300 hover:text-white"
              style={{ color: "rgba(201,168,76,0.9)" }}
            >
              Study each archetype in depth →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 reveal reveal-delay-7">
          <nav className="flex items-center justify-center gap-6 text-[10px] font-[family-name:var(--font-body)]" aria-label="Footer">
            <Link href="#archetypes" className="transition-colors duration-300 text-text-muted hover:text-white">
              Archetypes
            </Link>
            <span className="text-white/15" aria-hidden="true">|</span>
            <Link href="/privacy" className="transition-colors duration-300 text-text-muted hover:text-white">
              Privacy
            </Link>
            <span className="text-white/15" aria-hidden="true">|</span>
            <Link href="/terms" className="transition-colors duration-300 text-text-muted hover:text-white">
              Terms
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
