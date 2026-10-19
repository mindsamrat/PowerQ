import type { Metadata } from "next";
import Link from "next/link";
import { withArticle } from "@/lib/sanitize";
import { notFound } from "next/navigation";
import {
  archetypes,
  axisLabels,
  axisNarratives,
  bandFor,
  getArchetypeById,
  getCentroid,
  getEnemy,
  getRarityRank,
  type Archetype,
  type AxisId,
} from "@/data/archetypes";
import { signatureOptionsFor } from "@/lib/archetype-insights";

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

export function generateStaticParams() {
  return archetypes.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = getArchetypeById(id);
  if (!a) return { title: "Archetype not found" };
  const description = `${a.tagline} ${a.archetypeDepth.split(". ")[0]}.`;
  return {
    title: `${a.name} — Power Archetype | PQ, Way of Gods`,
    description,
    alternates: { canonical: `/archetypes/${a.id}` },
    openGraph: {
      title: `${a.name}: ${a.tagline}`,
      description,
      url: `https://quiz.wayofgods.com/archetypes/${a.id}`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: `${a.name}: ${a.tagline}`, description },
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function ArchetypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = getArchetypeById(id);
  if (!a) notFound();

  const enemy = getEnemy(a);
  const rank = getRarityRank(a);
  const centroid = getCentroid(a);
  const amp = getArchetypeById(a.pairings.amplifies.id);
  const drain = getArchetypeById(a.pairings.drains.id);
  const signature = signatureOptionsFor(a, 6);
  const others = archetypes.filter((x) => x.id !== a.id);
  const accent = a.cardAccent;

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(ellipse 120% 60% at 50% -10%, ${accent}26, transparent 55%), linear-gradient(180deg, #0F0B0D 0%, #0A0A0A 100%)`,
      }}
    >
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.35)" }}>
          <Link href="/archetypes" className="hover:text-white/70 transition-colors">← All archetypes</Link>
          <Link href="/" className="hover:text-white/70 transition-colors">Way of Gods</Link>
        </div>

        {/* Hero */}
        <header className="text-center pt-14 pb-10">
          <p className="text-[10px] tracking-[0.35em] uppercase mb-5 font-[family-name:var(--font-body)]" style={{ color: accent }}>
            Archetype · est. {a.rarity}% of people · {ordinal(rank)} rarest of 8
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-7xl font-bold leading-none mb-4" style={{ textShadow: `0 0 60px ${accent}55` }}>
            {a.name}
          </h1>
          <p className="italic font-[family-name:var(--font-heading)] text-lg md:text-xl mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
            {a.tagline}
          </p>
          <p className="text-[11px] tracking-[0.25em] uppercase font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.8)" }}>
            Totem · {a.totem.animal}
          </p>
          <p className="text-sm italic mt-2 max-w-md mx-auto font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.45)" }}>
            {a.totem.meaning}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-9">
            <Link href="/quiz" className="bg-[#C41E3A] hover:bg-[#E8526A] text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)]">
              Am I {withArticle(a.name)}? Take the assessment
            </Link>
            <a href={`/book?from=archetype&archetype=${a.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm py-3.5 px-8 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)]" style={{ background: "rgba(201,168,76,1)", color: "#0A0A0A" }}>
              Get Sovereign Doctrine
            </a>
          </div>
        </header>

        <Section label="The pattern" title="How this archetype works.">
          <p className="text-[15px] leading-[1.85] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.8)" }}>{a.archetypeDepth}</p>
        </Section>

        <Section label="Typical signature" title="Where it sits on the four axes.">
          <p className="text-sm mb-6 font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.5)" }}>
            The shaded band is the range this archetype usually occupies. Your own scores can sit anywhere; what defines the archetype is the direction of the whole pattern, not any single number.
          </p>
          <div className="space-y-6">
            {AXES.map((ax) => {
              const range = a[ax];
              const band = bandFor(centroid[ax]);
              return (
                <div key={ax}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs tracking-[0.25em] uppercase font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.6)" }}>{axisLabels[ax]}</span>
                    <span className="text-xs font-[family-name:var(--font-body)] font-semibold" style={{ color: accent }}>{range.min}–{range.max} · {band}</span>
                  </div>
                  <div className="relative h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="absolute top-0 bottom-0 rounded-full" style={{ left: `${range.min}%`, width: `${range.max - range.min}%`, background: accent, opacity: 0.85 }} />
                    <div className="absolute top-0 bottom-0 w-px" style={{ left: "50%", background: "rgba(255,255,255,0.35)" }} />
                  </div>
                  <p className="text-sm mt-2 font-[family-name:var(--font-body)] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{axisNarratives[ax][band]}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section label="Recognise one" title="Three signatures. Three life patterns.">
          <ol className="space-y-3 mb-8">
            {a.signatureTraits.map((t, i) => (
              <li key={i} className="glass rounded-xl p-5 border-gradient flex items-start gap-4">
                <span className="font-[family-name:var(--font-heading)] text-2xl font-bold shrink-0" style={{ color: accent }}>0{i + 1}</span>
                <p className="text-[15px] leading-[1.7] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.85)" }}>{t}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-4">
            {a.lifePatterns.map((p, i) => (
              <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${accent}` }}>
                <p className="text-[10px] tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-body)]" style={{ color: accent }}>{p.context}</p>
                <p className="text-sm leading-[1.75] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.75)" }}>{p.pattern}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section label="In the instrument's words" title="Answers that point here.">
          <p className="text-sm mb-6 font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.5)" }}>
            The assessment never asks &ldquo;are you a {a.name.replace(/^The /, "")}?&rdquo;. These are the choices, in situations, that pull hardest toward this archetype.
          </p>
          <div className="space-y-3">
            {signature.map((s) => (
              <div key={`${s.questionId}-${s.text}`} className="glass rounded-xl p-4 border-gradient">
                <p className="text-xs italic mb-1.5 font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.5)" }}>{s.prompt}</p>
                <p className="text-[15px] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.9)" }}>&ldquo;{s.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </Section>

        <Section label="How they win" title={`Where ${a.name.replace(/^The /, "the ")} dominates.`}>
          <div className="space-y-5">
            {a.winScenarios.map((w, i) => (
              <div key={i}>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold mb-1.5">{i + 1}. {w.label}</h3>
                <p className="text-sm leading-[1.8] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.7)" }}>{w.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section label="How they lose" title="The failure modes history records.">
          <div className="space-y-5">
            {a.loseModes.map((l, i) => (
              <div key={i}>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold mb-1.5" style={{ color: "#E8526A" }}>{i + 1}. {l.label}</h3>
                <p className="text-sm leading-[1.8] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.7)" }}>{l.text}</p>
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-6 border-gradient mt-8">
            <p className="text-[10px] tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.8)" }}>The shadow gift</p>
            <p className="text-sm leading-[1.8] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.8)" }}>{a.shadowGift}</p>
          </div>
        </Section>

        <Section label="Enemies and allies" title="Who neutralises you. Who multiplies you.">
          <ArchetypeLinkCard label="Natural enemy" target={enemy} accent="#E8526A" body={a.enemyTactics} />
          {amp && <ArchetypeLinkCard label="Amplified by" target={amp} accent="#9BBF7B" body={a.pairings.amplifies.reason} />}
          {drain && <ArchetypeLinkCard label="Drained by" target={drain} accent="#E8A85A" body={a.pairings.drains.reason} />}
        </Section>

        <Section label="The seven laws" title={`Imperatives for ${a.name.replace(/^The /, "the ")}.`}>
          <ol className="space-y-4">
            {a.laws.map((law, i) => (
              <li key={i} className="flex items-start gap-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="font-[family-name:var(--font-heading)] text-xl font-bold shrink-0 w-8" style={{ color: "rgba(201,168,76,0.85)" }}>{String(i + 1).padStart(2, "0")}</span>
                <p className="text-[15px] leading-[1.7] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.85)" }}>{law}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section label="Level up" title="The 90-day roadmap.">
          <div className="space-y-5">
            {a.roadmap.map((r, i) => (
              <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-[family-name:var(--font-body)] font-semibold" style={{ color: accent }}>{r.phase}</span>
                  <span className="text-[10px] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.35)" }}>{r.weeks}</span>
                </div>
                <p className="text-sm leading-[1.75] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.8)" }}>{r.focus}</p>
              </div>
            ))}
          </div>
          <ul className="mt-8 space-y-3">
            {a.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-[1.7] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.7)" }}>
                <span style={{ color: accent }}>·</span>{rec}
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Carried this pattern" title="Named examples.">
          <p className="text-sm leading-[1.8] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.7)" }}>
            {a.famousExamples.join(" · ")}
          </p>
        </Section>

        <Section label="A closing note" title={`To every ${a.name.replace(/^The /, "")}.`}>
          <p className="text-[15px] leading-[1.85] italic font-[family-name:var(--font-heading)]" style={{ color: "rgba(255,255,255,0.75)" }}>{a.closingLetter}</p>
        </Section>

        {/* Book CTA */}
        <div className="glass rounded-2xl p-7 md:p-9 border-gradient text-center mt-4" style={{ borderColor: `${accent}33` }}>
          <p className="text-[10px] tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.85)" }}>The book</p>
          <h3 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold mb-3">Sovereign Doctrine</h3>
          <p className="text-sm md:text-[15px] leading-[1.75] font-[family-name:var(--font-body)] max-w-md mx-auto mb-6" style={{ color: "rgba(255,255,255,0.8)" }}>{a.doctrineHook}</p>
          <a href={`/book?from=archetype&archetype=${a.id}`} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-sm py-4 px-10 rounded-xl font-[family-name:var(--font-body)]" style={{ background: "rgba(201,168,76,1)", color: "#0A0A0A", boxShadow: "0 0 24px rgba(201,168,76,0.35)" }}>
            Get Sovereign Doctrine
          </a>
        </div>

        {/* The other seven */}
        <div className="mt-16">
          <p className="text-[10px] tracking-[0.3em] uppercase text-center mb-6 font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.35)" }}>The other seven</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {others.map((o) => (
              <Link key={o.id} href={`/archetypes/${o.id}`} className="rounded-xl p-4 text-center transition-colors duration-300 hover:bg-white/[0.05]" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${o.cardAccent}2E` }}>
                <p className="font-[family-name:var(--font-heading)] text-base font-bold">{o.name.replace(/^The /, "")}</p>
                <p className="text-[10px] mt-1 font-[family-name:var(--font-body)]" style={{ color: o.cardAccent }}>{o.id === a.enemyId ? "Your enemy" : `est. ${o.rarity}%`}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/quiz" className="inline-block bg-[#C41E3A] hover:bg-[#E8526A] text-white font-semibold text-sm py-4 px-10 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)]">
              Find out which one you are
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-12 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.8)" }}>{label}</p>
      <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold mb-6 leading-tight">{title}</h2>
      {children}
    </section>
  );
}

function ArchetypeLinkCard({ label, target, accent, body }: { label: string; target: Archetype; accent: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6 border-gradient mb-4">
      <p className="text-[10px] tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-body)]" style={{ color: accent }}>{label}</p>
      <Link href={`/archetypes/${target.id}`} className="font-[family-name:var(--font-heading)] text-2xl font-bold hover:underline underline-offset-4 decoration-1">
        {target.name} →
      </Link>
      <p className="italic text-sm mt-1 mb-3 font-[family-name:var(--font-heading)]" style={{ color: "rgba(255,255,255,0.5)" }}>{target.tagline}</p>
      <p className="text-sm leading-[1.8] font-[family-name:var(--font-body)]" style={{ color: "rgba(255,255,255,0.75)" }}>{body}</p>
    </div>
  );
}
