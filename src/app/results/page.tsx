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
import { computeSignatureAnswers, type SignatureAnswer, type StoredAnswer } from "@/lib/signature-answers";
import { matchArchetype, type AxisScores } from "@/lib/scoring";
import {
  archetypeBlend,
  deriveReadings,
  perAxisAttribution,
  readConfidence,
  topArchetypes,
  type AxisAttribution,
  type BlendEntry,
  type ConfidenceReading,
  type DerivedReading,
} from "@/lib/result-analysis";

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

  const match = useMemo(() => matchArchetype(scores), [scores]);
  const blend = useMemo(() => archetypeBlend(scores), [scores]);
  const confidence = useMemo(() => readConfidence(match), [match]);
  const readings = useMemo(() => deriveReadings(scores), [scores]);

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

  const accent = archetype.cardAccent;
  return (
    <main
      className="min-h-screen relative grain text-white"
      style={{
        background: `radial-gradient(ellipse 120% 70% at 50% -5%, ${accent}22, transparent 55%), radial-gradient(ellipse 80% 60% at 50% 105%, ${accent}18, transparent 60%), linear-gradient(180deg, #0F0B0D 0%, #0B0A0D 40%, #0A0A0A 100%)`,
      }}
    >
      <div className="particle" /><div className="particle" /><div className="particle" />
      <div className="particle" /><div className="particle" /><div className="particle" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full blur-[160px]" style={{ background: `${accent}1A` }} />
        <div className="absolute top-[45%] left-[-10%] w-[420px] h-[420px] rounded-full blur-[140px]" style={{ background: `${accent}0E` }} />
        <div className="absolute bottom-[5%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: "#C9A84C12" }} />
      </div>

      <div className="relative z-10 pt-8 pb-2 text-center">
        <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
          PQ Assessment Result
        </span>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 pb-24">
        <RevealSection archetype={archetype} pq={pq} />
        <Divider />
        <ConfidenceSection confidence={confidence} accent={archetype.cardAccent} />
        <Divider />
        <BlendSection blend={blend} accent={archetype.cardAccent} />
        <Divider />
        <TraitsSection archetype={archetype} />
        <Divider />
        <RaritySection archetype={archetype} rank={rank} />
        <Divider />
        <AxisBreakdownSection scores={scores} accent={archetype.cardAccent} />
        <Divider />
        <PerAxisAttributionSection scores={scores} accent={archetype.cardAccent} />
        <Divider />
        <SignatureAnswersSection archetype={archetype} />
        <Divider />
        <DerivedReadingsSection readings={readings} accent={archetype.cardAccent} />
        <Divider />
        <RecommendationsSection archetype={archetype} />
        <Divider />
        <EnemySection archetype={archetype} enemy={enemy} />
        <Divider />
        <WeaknessSection archetype={archetype} />
        <Divider />
        <ShareCardSection archetype={archetype} cardUrl={cardUrl} />
        <Divider />
        <UpsellSection archetype={archetype} scores={scores} pq={pq} />
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

function ConfidenceSection({
  confidence,
  accent,
}: {
  confidence: ConfidenceReading;
  accent: string;
}) {
  const dot =
    confidence.level === "high" ? "#3FBF63"
    : confidence.level === "moderate" ? "#D4B86A"
    : "#E8526A";
  return (
    <section className="text-center">
      <div
        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${accent}30`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: dot, boxShadow: `0 0 12px ${dot}80` }}
        />
        <span className="text-[11px] tracking-[0.25em] uppercase font-semibold font-[family-name:var(--font-body)]" style={{ color: dot }}>
          {confidence.label}
        </span>
      </div>
      <p className="text-text-muted/60 text-sm md:text-[15px] font-[family-name:var(--font-body)] mt-5 max-w-md mx-auto leading-relaxed">
        {confidence.description}
      </p>
    </section>
  );
}

function BlendSection({
  blend,
  accent,
}: {
  blend: BlendEntry[];
  accent: string;
}) {
  const top = topArchetypes(blend, 3);
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 text-center font-[family-name:var(--font-body)]">
        Archetype Blend
      </p>
      <p className="text-text-muted/45 text-xs italic font-[family-name:var(--font-body)] text-center mb-7 max-w-sm mx-auto">
        No one is a pure type. Here's how your signature distributes across all 8 archetypes.
      </p>
      <div className="flex flex-col gap-4">
        {top.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-[family-name:var(--font-heading)] text-base md:text-lg font-semibold text-text-primary">
                {entry.name}
              </span>
              <span className="font-[family-name:var(--font-heading)] text-lg font-bold" style={{ color: accent }}>
                {entry.percent}%
              </span>
            </div>
            <div className="h-[3px] w-full bg-divider-dark rounded-full overflow-hidden">
              <div
                className="h-full transition-[width] duration-1000 ease-out"
                style={{ width: `${entry.percent}%`, background: accent }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PerAxisAttributionSection({
  scores,
  accent,
}: {
  scores: AxisScores;
  accent: string;
}) {
  const [attribution, setAttribution] = useState<AxisAttribution | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pq_answers_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAnswer[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydration
      setAttribution(perAxisAttribution(parsed));
    } catch { /* ignore */ }
  }, []);

  if (!attribution) return null;
  const axes: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 text-center font-[family-name:var(--font-body)]">
        How Each Axis Was Built
      </p>
      <p className="text-text-muted/45 text-xs italic font-[family-name:var(--font-body)] text-center mb-7 max-w-sm mx-auto">
        For every axis, the two answers that pushed your score there the most.
      </p>
      <div className="flex flex-col gap-6">
        {axes.map((axis) => {
          const entries = attribution[axis];
          if (!entries || entries.length === 0) return null;
          return (
            <div key={axis}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs tracking-[0.25em] uppercase text-text-muted/70 font-[family-name:var(--font-body)] font-semibold">
                  {axisLabels[axis]}
                </span>
                <span className="font-[family-name:var(--font-heading)] text-base font-semibold" style={{ color: accent }}>
                  {scores[axis]}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {entries.map((e) => (
                  <div
                    key={e.questionId}
                    className="glass rounded-xl p-4 border-gradient"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 font-[family-name:var(--font-body)]">
                        {e.framework?.name ?? "Framework"}
                      </span>
                      <span
                        className="text-[10px] font-[family-name:var(--font-body)] font-semibold"
                        style={{ color: e.delta > 0 ? "#3FBF63" : "#E8526A" }}
                      >
                        {e.delta > 0 ? "+" : ""}{e.delta} on {axisLabels[axis]}
                      </span>
                    </div>
                    <p className="text-text-primary/70 text-xs italic font-[family-name:var(--font-body)] mb-1.5">
                      {e.prompt}
                    </p>
                    <p className="text-text-primary/95 text-sm font-[family-name:var(--font-body)] leading-relaxed">
                      &ldquo;{e.optionText}&rdquo;
                    </p>
                    {e.framework && (
                      <p className="text-text-muted/35 text-[10px] mt-2 font-[family-name:var(--font-body)]">
                        {e.framework.citation} · {e.framework.probes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DerivedReadingsSection({
  readings,
  accent,
}: {
  readings: DerivedReading[];
  accent: string;
}) {
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 text-center font-[family-name:var(--font-body)]">
        Per-Axis Reading
      </p>
      <p className="text-text-muted/45 text-xs italic font-[family-name:var(--font-body)] text-center mb-7 max-w-sm mx-auto">
        What your score on each axis actually means — strength, warning, and one move to practice.
      </p>
      <div className="flex flex-col gap-5">
        {readings.map((r) => (
          <div key={r.axis} className="glass rounded-xl p-5 md:p-6 border-gradient">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs tracking-[0.25em] uppercase text-text-muted/70 font-[family-name:var(--font-body)] font-semibold">
                {r.label}
              </span>
              <span
                className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: `${accent}20`,
                  color: accent,
                  border: `1px solid ${accent}40`,
                }}
              >
                {r.band}
              </span>
            </div>
            <div className="space-y-3">
              <Reading label="Strength" body={r.strength} accent="#9BBF7B" />
              <Reading label="Warning" body={r.warning} accent="#E8A85A" />
              <Reading label="Practice" body={r.practice} accent={accent} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reading({ label, body, accent }: { label: string; body: string; accent: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="text-[9px] tracking-[0.25em] uppercase font-[family-name:var(--font-body)] font-semibold mt-1 shrink-0 w-16"
        style={{ color: accent }}
      >
        {label}
      </span>
      <p className="text-text-primary/85 text-sm font-[family-name:var(--font-body)] leading-[1.6]">
        {body}
      </p>
    </div>
  );
}

function TraitsSection({ archetype }: { archetype: Archetype }) {
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-5 text-center font-[family-name:var(--font-body)]">
        Your Signature Pattern
      </p>
      <div className="flex flex-col gap-3">
        {archetype.signatureTraits.map((trait, i) => (
          <div key={i} className="glass rounded-xl p-5 border-gradient flex items-start gap-4">
            <span
              className="font-[family-name:var(--font-heading)] text-2xl font-bold shrink-0"
              style={{ color: archetype.cardAccent }}
            >
              0{i + 1}
            </span>
            <p className="text-text-primary/85 text-sm md:text-[15px] leading-[1.7] font-[family-name:var(--font-body)]">
              {trait}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignatureAnswersSection({ archetype }: { archetype: Archetype }) {
  const [signature, setSignature] = useState<SignatureAnswer[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pq_answers_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAnswer[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydration on mount
      setSignature(computeSignatureAnswers(archetype, parsed));
    } catch { /* ignore */ }
  }, [archetype]);

  if (signature.length === 0) return null;

  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-2 text-center font-[family-name:var(--font-body)]">
        Why You Got {archetype.name}
      </p>
      <p className="text-text-muted/50 text-xs font-[family-name:var(--font-body)] text-center mb-6 italic max-w-sm mx-auto">
        The three answers that pulled hardest toward your archetype.
      </p>
      <div className="flex flex-col gap-4">
        {signature.map((s, i) => (
          <div key={s.questionId} className="glass rounded-xl p-5 border-gradient">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10px] tracking-[0.25em] uppercase text-text-muted/40 font-[family-name:var(--font-body)]">
                Signal {i + 1}
              </span>
              <span
                className="text-[10px] font-[family-name:var(--font-body)] font-semibold"
                style={{ color: archetype.cardAccent }}
              >
                +{s.pullScore.toFixed(1)} pull
              </span>
            </div>
            <p className="text-text-primary/75 text-xs md:text-sm font-[family-name:var(--font-body)] italic mb-2">
              {s.prompt}
            </p>
            <p className="text-text-primary/95 text-sm md:text-[15px] font-[family-name:var(--font-body)] leading-relaxed">
              &ldquo;{s.optionText}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationsSection({ archetype }: { archetype: Archetype }) {
  return (
    <section>
      <p
        className="text-[10px] tracking-[0.3em] uppercase mb-5 text-center font-[family-name:var(--font-body)]"
        style={{ color: `${archetype.cardAccent}CC` }}
      >
        Practice — Three Moves For {archetype.name}
      </p>
      <ol className="flex flex-col gap-3">
        {archetype.recommendations.map((rec, i) => (
          <li
            key={i}
            className="glass rounded-xl p-5 border-gradient flex items-start gap-4"
          >
            <span className="text-[10px] tracking-[0.25em] uppercase text-text-muted/40 font-[family-name:var(--font-body)] font-semibold mt-1 shrink-0 w-6">
              0{i + 1}
            </span>
            <p className="text-text-primary/85 text-sm md:text-[15px] leading-[1.7] font-[family-name:var(--font-body)]">
              {rec}
            </p>
          </li>
        ))}
      </ol>
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

function UpsellSection({
  archetype,
  scores,
  pq,
}: {
  archetype: Archetype;
  scores: Record<AxisId, number>;
  pq: number;
}) {
  return (
    <section className="flex flex-col gap-8">
      <PaidUnlockCard archetype={archetype} />
      <FreePdfSection archetype={archetype} scores={scores} pq={pq} />
    </section>
  );
}

function PaidUnlockCard({ archetype }: { archetype: Archetype }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setError(null);
    setLoading(true);
    try {
      const responseId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("pq_response_id")
          : null;

      if (!responseId) {
        setError("Your session has expired. Re-take the quiz to unlock the report.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/checkout/dodo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId }),
      });
      const text = await res.text();
      let body: { checkoutUrl?: string; error?: string } = {};
      try { body = JSON.parse(text); } catch { /* keep raw */ }

      if (!res.ok || !body.checkoutUrl) {
        setError(
          body.error
            ? `Checkout error (${res.status}): ${body.error}`
            : `Checkout failed (${res.status}). Server said: ${text.slice(0, 200)}`
        );
        setLoading(false);
        return;
      }
      window.location.href = body.checkoutUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setError(`Network error: ${msg}. Try again.`);
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-8 md:p-10 border-gradient relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px]" />
      <div className="relative text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-[family-name:var(--font-body)]">
          Full PQ Report — $3
        </p>
        <h3 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-2">
          Unlock your full analysis.
        </h3>
        <p className="text-text-muted/50 text-sm mb-8 font-[family-name:var(--font-body)] max-w-sm mx-auto">
          A 24-page personalized report: {archetype.name} across love, money,
          leadership, enemies, and legacy. Quotes your actual answers. Watermarked
          to your email.
        </p>
        <button
          onClick={startCheckout}
          disabled={loading}
          className="w-full text-center bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-4 rounded-xl font-[family-name:var(--font-body)] transition-all duration-300 cursor-pointer glow-accent btn-shine"
        >
          {loading ? "Opening secure checkout…" : "Unlock Full Report — $3"}
        </button>
        {error && (
          <p className="text-accent text-xs mt-3 font-[family-name:var(--font-body)]">{error}</p>
        )}
        <p className="text-text-muted/40 text-[11px] mt-4 font-[family-name:var(--font-body)] italic">
          Secure payment via Dodo. Instant download. No subscription.
        </p>
      </div>
    </div>
  );
}

function FreePdfSection({
  archetype,
  scores,
  pq,
}: {
  archetype: Archetype;
  scores: Record<AxisId, number>;
  pq: number;
}) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          archetypeId: archetype.id,
          scores,
          pq,
          source: "free-pdf",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not process that email.");
        setStatus("error");
        return;
      }
      setDownloadUrl(body.downloadUrl);
      setStatus("ready");
    } catch {
      setError("Network error. Try again in a moment.");
      setStatus("error");
    }
  };

  if (status === "ready" && downloadUrl) {
    return (
      <div className="glass rounded-2xl p-8 md:p-10 border-gradient text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-[family-name:var(--font-body)]">
          Your Summary Is Ready
        </p>
        <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-6">
          PQ Free Summary — {archetype.name}
        </h3>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine"
        >
          Open your PDF
        </a>
        <p className="text-text-muted/40 text-[11px] mt-5 font-[family-name:var(--font-body)]">
          We will also email it to you once ConvertKit is wired up.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 md:p-10 border-gradient">
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-3 font-[family-name:var(--font-body)] text-center">
        Free 4-Page Summary
      </p>
      <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2 text-center">
        Get the PDF.
      </h3>
      <p className="text-text-muted/50 text-sm mb-6 font-[family-name:var(--font-body)] text-center max-w-sm mx-auto">
        Your archetype, axes, natural enemy, and the pattern to guard against.
        Delivered instantly.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className="w-full glass rounded-xl px-5 py-3.5 text-text-primary text-sm font-[family-name:var(--font-body)] placeholder:text-text-muted/30 focus:outline-none"
        />
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine cursor-pointer"
        >
          {status === "submitting" ? "Generating..." : "Email me the summary"}
        </button>
      </form>
      {error && (
        <p className="text-accent text-xs mt-3 text-center font-[family-name:var(--font-body)]">{error}</p>
      )}
      <p className="text-text-muted/30 text-[10px] mt-4 text-center font-[family-name:var(--font-body)]">
        No spam. Unsubscribe anytime.
      </p>
    </div>
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
