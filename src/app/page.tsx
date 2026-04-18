"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 10,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main className="relative min-h-screen bg-[#080808] overflow-hidden text-white">
      {/* UI Layer */}
      <div className="relative z-20 min-h-screen flex flex-col">

        {/* Top bar */}
        <div
          className={`pt-10 pb-4 text-center transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
        >
          <span
            className="text-[10px] tracking-[0.5em] uppercase font-[family-name:var(--font-body)]"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Way of Gods
          </span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Label */}
          <div
            className={`transition-all duration-700 delay-200 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <span
              className="inline-block text-[10px] tracking-[0.35em] uppercase mb-8 font-[family-name:var(--font-body)] px-4 py-2 rounded-full border"
              style={{
                color: "rgba(196,30,58,0.9)",
                borderColor: "rgba(196,30,58,0.2)",
                background: "rgba(196,30,58,0.04)",
                backdropFilter: "blur(10px)",
              }}
            >
              Psychological Power Assessment
            </span>
          </div>

          {/* Main heading */}
          <div
            className={`transition-all duration-1000 delay-300 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            style={{
              transform: loaded
                ? `translate(${mousePos.x * 0.03}px, ${mousePos.y * 0.03}px)`
                : undefined,
              transition: "opacity 1s, transform 1s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
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
              <span
                className="italic"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Archetype?
              </span>
            </h1>
          </div>

          {/* Divider line */}
          <div
            className={`transition-all duration-700 delay-500 ${loaded ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}`}
            style={{ transformOrigin: "center" }}
          >
            <div
              className="w-24 h-px my-10 mx-auto"
              style={{ background: "linear-gradient(90deg, transparent, rgba(196,30,58,0.4), transparent)" }}
            />
          </div>

          {/* Subtitle */}
          <div
            className={`transition-all duration-700 delay-600 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <p
              className="text-sm md:text-base max-w-md mx-auto mb-3 font-[family-name:var(--font-body)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              15 questions. 3 axes of power. 6 archetypes.
            </p>
            <p
              className="text-xs md:text-sm max-w-xs mx-auto mb-14 font-[family-name:var(--font-body)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              Mapped across neuroscience, behavioral psychology, and game theory.
            </p>
          </div>

          {/* CTA Button */}
          <div
            className={`transition-all duration-700 delay-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <Link
              href="/quiz"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="group relative inline-flex items-center gap-3 font-semibold text-sm md:text-base tracking-wide font-[family-name:var(--font-body)] overflow-hidden"
              style={{
                padding: "16px 48px",
                borderRadius: "4px",
                background: hovered
                  ? "rgba(232,82,106,1)"
                  : "rgba(196,30,58,1)",
                color: "#fff",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: hovered
                  ? "0 0 40px rgba(196,30,58,0.6), 0 0 80px rgba(196,30,58,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "0 0 20px rgba(196,30,58,0.3), 0 0 40px rgba(196,30,58,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                transform: hovered ? "scale(1.03)" : "scale(1)",
              }}
            >
              {/* Shine sweep */}
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: "btnSweep 3s ease-in-out infinite",
                }}
              />
              <span className="relative z-10">Begin The Assessment</span>
              <svg
                className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Stats row */}
          <div
            className={`mt-16 flex items-center gap-8 md:gap-12 transition-all duration-700 delay-[900ms] ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            {[
              { value: "15", label: "Questions" },
              { value: "3", label: "Power Axes" },
              { value: "6", label: "Archetypes" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p
                  className="font-[family-name:var(--font-heading)] font-bold mb-1"
                  style={{
                    fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                    color: "rgba(201,168,76,0.8)",
                    textShadow: "0 0 20px rgba(201,168,76,0.3)",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-body)]"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`py-8 transition-all duration-700 delay-[1000ms] ${loaded ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center justify-center gap-6 text-[10px] font-[family-name:var(--font-body)]">
            <Link
              href="/privacy"
              className="transition-colors duration-300"
              style={{ color: "rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.2)")}
            >
              Privacy
            </Link>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
            <Link
              href="/terms"
              className="transition-colors duration-300"
              style={{ color: "rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.2)")}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes btnSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  );
}
