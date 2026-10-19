import type { Metadata } from "next";
import Link from "next/link";
import { archetypes, getRarityRank } from "@/data/archetypes";

export const metadata: Metadata = {
  title: "The Eight Power Archetypes | PQ — Way of Gods",
  description:
    "Sovereign, Shadow, Architect, Oracle, Blade, Diplomat, Hunter, Flame. Study each power archetype in depth: how it wins, how it loses, its natural enemy, and the answers that point to it.",
  alternates: { canonical: "/archetypes" },
  openGraph: {
    title: "The Eight Power Archetypes",
    description: "Study each archetype: signature, enemies, laws, and how to level up.",
    url: "https://quiz.wayofgods.com/archetypes",
  },
  twitter: { card: "summary_large_image", title: "The Eight Power Archetypes", description: "Study each archetype: signature, enemies, laws, and how to level up." },
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ArchetypesIndex() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center mb-14">
          <Link href="/" className="text-[10px] tracking-[0.5em] uppercase font-[family-name:var(--font-body)] hover:text-white/60 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
            Way of Gods
          </Link>
          <p className="text-[10px] tracking-[0.35em] uppercase mt-10 mb-4 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.85)" }}>
            The Map of Power
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl font-bold leading-[1.05] mb-5">
            Eight ways power<br />actually works.
          </h1>
          <p className="text-sm md:text-base max-w-lg mx-auto leading-relaxed font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Every archetype is a combination of four axes: Control, Visibility, Time-Horizon and Power-Source. None is better than another. Each wins in specific rooms and loses in predictable ways. Study yours, then study your enemy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archetypes.map((a) => {
            const rank = getRarityRank(a);
            return (
              <Link
                key={a.id}
                href={`/archetypes/${a.id}`}
                className="group block rounded-2xl p-6 md:p-7 transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${a.cardAccent}33`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
                }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-body)]" style={{ color: a.cardAccent }}>
                    {a.totem.animal}
                  </span>
                  <span className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    est. {a.rarity}% · {ordinal(rank)} rarest
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold mb-2 group-hover:translate-x-0.5 transition-transform">
                  {a.name}
                </h2>
                <p className="italic font-[family-name:var(--font-heading)] text-base mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {a.tagline}
                </p>
                <p className="text-sm leading-relaxed font-[family-name:var(--font-body)] mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {a.signatureTraits[0]}
                </p>
                <span className="text-xs tracking-wider font-[family-name:var(--font-body)] font-semibold" style={{ color: a.cardAccent }}>
                  Study {a.name.replace(/^The /, "the ")} →
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-sm mb-6 font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Twenty-seven questions. Four axes. Find out which one you are.
          </p>
          <Link
            href="/quiz"
            className="inline-block bg-[#C41E3A] hover:bg-[#E8526A] text-white font-semibold text-sm py-4 px-10 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)]"
          >
            Take the assessment
          </Link>
        </div>
      </div>
    </main>
  );
}
