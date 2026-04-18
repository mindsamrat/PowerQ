"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  archetypes,
  axisLabels,
  axisNarratives,
  bandFor,
  getArchetypeById,
  getEnemy,
  getRarityRank,
  type Archetype,
  type AxisId,
} from "@/data/archetypes";

function clamp(raw: string | null, fallback = 50): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ResultsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ResultsPage />
    </Suspense>
  );
}

function ResultsPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "sovereign";
  const archetype = getArchetypeById(id) ?? archetypes[0];
  const scores: Record<AxisId, number> = useMemo(
    () => ({
      control: clamp(params.get("c")),
      visibility: clamp(params.get("v")),
      timeHorizon: clamp(params.get("t")),
      powerSource: clamp(params.get("p")),
    }),
    [params]
  );
  const pq = clamp(params.get("pq"));
  const enemy = getEnemy(archetype);
  const rank = getRarityRank(archetype);

  const cardUrl = useMemo(() => {
    const qs = new URLSearchParams({
      id: archetype.id,
      c: String(scores.control),
      v: String(scores.visibility),
      t: String(scores.timeHorizon),
      p: String(scores.powerSource),
    });
    return `/api/card?${qs.toString()}`;
  }, [archetype.id, scores]);

  return (
    <main className="min-h-screen bg-primary-bg bg-gradient-animate relative grain">
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: `${archetype.cardAccent}0A` }} />
      </div>

      <div className="relative z-10 pt-8 pb-2 text-center">
        <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
          PQ Assessment Result
        </span>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 pb-24">
        <RevealSection archetype={archetype} pq={pq} />
        <Divider />
        <RaritySection archetype={archetype} rank={rank} />
        <Divider />
        <AxisBreakdownSection scores={scores} accent={archetype.cardAccent} />
        <Divider />
        <EnemySection archetype={archetype} enemy={enemy} />
        <Divider />
        <WeaknessSection archetype={archetype} />
        <Divider />
        <ShareCardSection archetype={archetype} cardUrl={cardUrl} />
        <Divider />
        <UpsellSection archetype={archetype} />
        <Divider />
        <ComparisonSection archetype={archetype} />

        <div className="mt-16 pt-8 border-t border-divider-dark text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/20 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>
      </div>
    </main>
  );
}

function Divider() {
  return <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-12" />;
}

function RevealSection({ archetype, pq }: { archetype: Archetype; pq: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * pq));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pq]);

  return (
    <section className="text-center pt-10 pb-4">
      <p className="text-[10px] tracking-[0.3em] uppercase mb-5 font-[family-name:var(--font-body)] reveal" style={{ color: `${archetype.cardAccent}CC` }}>
        Your Power Archetype
      </p>
      <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl font-bold text-text-primary mb-4 reveal reveal-delay-1 glow-text leading-none">
        {archetype.name}
      </h1>
      <p className="text-text-muted/60 text-base md:text-lg italic font-[family-name:var(--font-heading)] reveal reveal-delay-2">
        {archetype.tagline}
      </p>

      <div className="mt-14 reveal reveal-delay-3">
        <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 font-[family-name:var(--font-body)]">
          PQ Score
        </p>
        <p className="font-[family-name:var(--font-heading)] text-7xl md:text-8xl font-bold text-gold glow-gold">
          {displayed}
        </p>
        <p className="text-text-muted/30 text-xs font-[family-name:var(--font-body)] mt-1">out of 100</p>
      </div>
    </section>
  );
}

function RaritySection({ archetype, rank }: { archetype: Archetype; rank: number }) {
  const rareLabel = rank === 1 ? "the rarest" : `the ${ordinal(rank)} rarest`;
  return (
    <section className="text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-4 font-[family-name:var(--font-body)]">
        Rarity Signal
      </p>
      <p className="font-[family-name:var(--font-heading)] text-6xl font-bold text-text-primary leading-none">
        {archetype.rarity}%
      </p>
      <p className="text-text-muted/60 text-sm font-[family-name:var(--font-body)] mt-5 max-w-xs mx-auto leading-relaxed">
        of everyone who takes this assessment scores as {archetype.name}.
      </p>
      <p className="text-text-muted/40 text-xs font-[family-name:var(--font-body)] italic mt-3">
        {archetype.name} is {rareLabel} of 8 archetypes.
      </p>
    </section>
  );
}

function AxisBreakdownSection({
  scores,
  accent,
}: {
  scores: Record<AxisId, number>;
  accent: string;
}) {
  const axes = Object.keys(axisLabels) as AxisId[];
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-8 text-center font-[family-name:var(--font-body)]">
        Your Power Signature
      </p>
      <div className="space-y-7">
        {axes.map((axis) => {
          const value = scores[axis];
          const narrative = axisNarratives[axis][bandFor(value)];
          return (
            <div key={axis}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs tracking-[0.25em] uppercase text-text-muted/60 font-[family-name:var(--font-body)]">
                  {axisLabels[axis]}
                </span>
                <span className="font-[family-name:var(--font-heading)] text-xl font-semibold text-text-primary">
                  {value}
                </span>
              </div>
              <div className="h-[3px] w-full bg-divider-dark rounded-full overflow-hidden mb-3">
                <div
                  className="h-full transition-[width] duration-1000 ease-out"
                  style={{ width: `${value}%`, background: accent }}
                />
              </div>
              <p className="text-sm text-text-muted/70 font-[family-name:var(--font-body)] leading-relaxed">
                {narrative}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EnemySection({ archetype, enemy }: { archetype: Archetype; enemy: Archetype }) {
  return (
    <section className="text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-5 font-[family-name:var(--font-body)]">
        Your Natural Enemy
      </p>
      <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-5 glow-text">
        {enemy.name}
      </h2>
      <div className="glass rounded-2xl p-6 md:p-8 border-gradient text-left">
        <p className="text-text-primary/80 text-sm md:text-[15px] leading-[1.8] font-[family-name:var(--font-body)]">
          The only archetype built to neutralize {archetype.name}. They operate where
          you do not — and they see what you miss. Learn to spot them, or they will
          spot you first.
        </p>
      </div>
    </section>
  );
}

function WeaknessSection({ archetype }: { archetype: Archetype }) {
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold/60 mb-5 font-[family-name:var(--font-body)] text-center">
        What {archetype.name} Must Guard Against
      </p>
      <div className="glass rounded-2xl p-6 md:p-8 border-gradient">
        <p className="text-text-muted/80 text-sm md:text-[15px] leading-[1.8] font-[family-name:var(--font-body)]">
          {archetype.shadowGift}
        </p>
      </div>
    </section>
  );
}

function ShareCardSection({
  archetype,
  cardUrl,
}: {
  archetype: Archetype;
  cardUrl: string;
}) {
  const [status, setStatus] = useState<null | "copied" | "error" | "shared" | "downloading">(null);

  const shareText = `My PQ Power Archetype is ${archetype.name}. Take the assessment → quiz.wayofgods.com`;
  const shareTitle = `I am ${archetype.name}`;

  const handleShare = async () => {
    setStatus("downloading");
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], `pq-${archetype.id}.png`, { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, title: shareTitle });
        setStatus("shared");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pq-${archetype.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("shared");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
      window.setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-6 text-center font-[family-name:var(--font-body)]">
        Shareable Card
      </p>

      <div className="flex justify-center mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt={`${archetype.name} shareable card`}
          className="max-w-[280px] w-full rounded-lg border border-divider-dark"
        />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleShare}
          className="bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine cursor-pointer"
        >
          {status === "downloading" ? "Preparing..." : status === "shared" ? "Ready — pick an app" : "Share Card"}
        </button>
        <button
          onClick={handleCopy}
          className="glass glass-hover text-text-primary/70 text-sm py-3.5 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] cursor-pointer"
        >
          {status === "copied" ? "Link copied." : "Copy share text + link"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-accent text-xs text-center mt-3 font-[family-name:var(--font-body)]">
          Something went wrong. Try downloading the image directly.
        </p>
      )}
    </section>
  );
}

function UpsellSection({ archetype }: { archetype: Archetype }) {
  return (
    <section>
      <div className="glass rounded-2xl p-8 md:p-10 border-gradient relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px]" />
        <div className="relative text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-[family-name:var(--font-body)]">
            Full PQ Report
          </p>
          <h3 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Unlock your full analysis.
          </h3>
          <p className="text-text-muted/50 text-sm mb-8 font-[family-name:var(--font-body)] max-w-sm mx-auto">
            A 24-page personalized report: {archetype.name} across love, money,
            leadership, enemies, and legacy.
          </p>
          <button
            disabled
            className="w-full text-center bg-accent/40 text-white/80 font-semibold text-sm py-4 rounded-xl font-[family-name:var(--font-body)] cursor-not-allowed"
          >
            Full Report — coming soon
          </button>
          <p className="text-text-muted/40 text-[11px] mt-4 font-[family-name:var(--font-body)] italic">
            Free email summary and full PDF arrive in the next release.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection({ archetype }: { archetype: Archetype }) {
  const shareText = `Just got ${archetype.name} on the PQ Assessment. Take it and send me yours: quiz.wayofgods.com`;
  const encoded = encodeURIComponent(shareText);
  return (
    <section className="text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-4 font-[family-name:var(--font-body)]">
        Send this to 3 people
      </p>
      <p className="text-text-muted/60 text-sm font-[family-name:var(--font-body)] max-w-sm mx-auto leading-relaxed mb-6">
        See which archetype they are. Your pairings — and your rivals — will
        start to emerge.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <a
          href={`https://wa.me/?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass glass-hover text-text-primary/70 text-sm px-5 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)]"
        >
          WhatsApp
        </a>
        <a
          href={`sms:?&body=${encoded}`}
          className="glass glass-hover text-text-primary/70 text-sm px-5 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)]"
        >
          iMessage / SMS
        </a>
        <Link
          href="/quiz"
          className="glass glass-hover text-text-primary/70 text-sm px-5 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)]"
        >
          Take it again
        </Link>
      </div>
    </section>
  );
}
