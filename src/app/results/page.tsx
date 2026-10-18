"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { matchArchetype, type AxisScores, type MatchResult } from "@/lib/scoring";
import {
  archetypeBlend,
  deriveReadings,
  evaluateContradictions,
  interactionReadings,
  perAxisAttribution,
  readConfidence,
  topArchetypes,
  type AxisAttribution,
  type BlendEntry,
  type ConfidenceReading,
  type ConsistencyResult,
  type DerivedReading,
} from "@/lib/result-analysis";
import { PAID_REPORT_PAGES, REPORT_PRICE_LABEL } from "@/data/report-meta";

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

/** Holds a completed submission the quiz page could not save. Must match quiz/page.tsx. */
const PENDING_KEY = "pq_pending_submit_v1";
const PENDING_MAX_AGE_MS = 1000 * 60 * 60 * 48;
/** Last saved response, so a revisit or a new tab can still buy the report. Must match quiz/page.tsx. */
const LAST_RESPONSE_KEY = "pq_last_response_v1";
const LAST_RESPONSE_MAX_AGE_MS = 1000 * 60 * 60 * 48;

type SaveStatus = "ok" | "retrying" | "unsaved";

/**
 * If the quiz finished while the database was unreachable, the submission was
 * parked in localStorage. Retry it quietly here so a brief outage doesn't cost
 * the respondent their report — or us the lead.
 */
function usePendingSubmitRecovery(archetypeId: string): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("ok");

  useEffect(() => {
    let raw: string | null = null;
    try {
      if (sessionStorage.getItem("pq_response_id")) return;
      raw = localStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let parsed: { savedAt?: number; payload?: unknown } | null = null;
    try { parsed = JSON.parse(raw) as { savedAt?: number; payload?: unknown }; } catch { /* ignore */ }
    if (!parsed?.payload || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > PENDING_MAX_AGE_MS) {
      try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- entering retry state on mount
    setStatus("retrying");

    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        if (attempt > 0) await new Promise((r) => window.setTimeout(r, 4000 * attempt));
        try {
          const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.payload),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && typeof body.responseId === "string" && body.responseId) {
            try {
              sessionStorage.setItem("pq_response_id", body.responseId);
              localStorage.setItem(LAST_RESPONSE_KEY, JSON.stringify({ id: body.responseId, archetypeId, savedAt: Date.now() }));
              localStorage.removeItem(PENDING_KEY);
            } catch { /* ignore */ }
            if (!cancelled) setStatus("ok");
            return;
          }
          // A 4xx means the payload itself is the problem; retrying won't help.
          if (res.status >= 400 && res.status < 500) break;
        } catch { /* network still down — keep trying */ }
      }
      if (!cancelled) setStatus("unsaved");
    })();

    return () => { cancelled = true; };
  }, [archetypeId]);

  return status;
}

function SaveStatusNotice({ status }: { status: SaveStatus }) {
  if (status === "ok") return null;
  const retrying = status === "retrying";
  return (
    <div
      className="mt-10 rounded-xl px-5 py-4 text-center"
      style={{ background: "rgba(232,168,90,0.07)", border: "1px solid rgba(232,168,90,0.22)" }}
    >
      <p
        className="text-[10px] tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-body)]"
        style={{ color: "#E8A85A" }}
      >
        {retrying ? "Saving your profile" : "Profile not saved"}
      </p>
      <p className="text-text-muted/70 text-xs leading-relaxed font-[family-name:var(--font-body)]">
        {retrying
          ? "Everything below is your real result. We're still storing your profile — give it a few seconds."
          : "Everything below is your real result and yours to keep. We could not store your profile just now, so the full report cannot be prepared yet. Refresh this page in a minute and it will retry."}
      </p>
    </div>
  );
}

function ResultsPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "sovereign";
  const archetype = getArchetypeById(id) ?? archetypes[0];
  const saveStatus = usePendingSubmitRecovery(archetype.id);
  const purchase = usePurchaseState(archetype.id, saveStatus);
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
  const confidence = useMemo(() => readConfidence(match, pq), [match, pq]);
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

      <div className="relative z-10 max-w-lg mx-auto px-6 pb-40">
        <RevealSection archetype={archetype} pq={pq} />
        <SaveStatusNotice status={saveStatus} />
        <Divider />
        <ConfidenceSection confidence={confidence} match={match} accent={archetype.cardAccent} />
        <Divider />
        <UnlockTeaser archetype={archetype} purchase={purchase} saveStatus={saveStatus} />
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
        <InteractionsSection scores={scores} accent={archetype.cardAccent} />
        <Divider />
        <ConsistencySection accent={archetype.cardAccent} />
        <Divider />
        <RecommendationsSection archetype={archetype} />
        <Divider />
        <EnemySection archetype={archetype} enemy={enemy} />
        <Divider />
        <WeaknessSection archetype={archetype} />
        <Divider />
        <DoctrineSection archetype={archetype} />
        <Divider />
        <ShareCardSection archetype={archetype} cardUrl={cardUrl} />
        <Divider />
        <UpsellSection archetype={archetype} scores={scores} pq={pq} saveStatus={saveStatus} purchase={purchase} />
        <Divider />
        <ComparisonSection archetype={archetype} />

        <div className="mt-16 pt-8 border-t border-divider-dark text-center">
          <span className="text-[9px] tracking-[0.4em] uppercase text-text-muted/20 font-[family-name:var(--font-body)]">
            Way of Gods
          </span>
        </div>
      </div>
      <StickyUnlockBar archetype={archetype} purchase={purchase} saveStatus={saveStatus} />
    </main>
  );
}

function Divider() {
  return <div className="w-20 h-px bg-gradient-to-r from-transparent via-divider-dark to-transparent mx-auto my-12" />;
}

function DoctrineSection({ archetype }: { archetype: Archetype }) {
  const href = `/book?from=results&archetype=${encodeURIComponent(archetype.id)}`;
  return (
    <section>
      <div
        className="glass rounded-2xl p-7 md:p-9 border-gradient relative overflow-hidden text-center"
        style={{ borderColor: `${archetype.cardAccent}33` }}
      >
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[320px] h-[200px] rounded-full blur-[90px] pointer-events-none"
          style={{ background: `${archetype.cardAccent}22` }}
        />
        <p className="relative text-[10px] tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-body)]" style={{ color: "rgba(201,168,76,0.85)" }}>
          The Book
        </p>
        <h3 className="relative font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-3">
          Sovereign Doctrine
        </h3>
        <p className="relative text-text-primary/80 text-sm md:text-[15px] leading-[1.75] font-[family-name:var(--font-body)] max-w-md mx-auto mb-7">
          {archetype.doctrineHook}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block font-semibold text-sm py-4 px-10 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] btn-shine"
          style={{
            background: "rgba(201,168,76,1)",
            color: "#0A0A0A",
            boxShadow: "0 0 24px rgba(201,168,76,0.35), 0 0 60px rgba(201,168,76,0.12)",
          }}
        >
          Get Sovereign Doctrine
        </a>
        <p className="relative text-text-muted/40 text-[11px] mt-4 font-[family-name:var(--font-body)] italic">
          Written for {archetype.name}s and the seven archetypes they have to deal with.
        </p>
      </div>
    </section>
  );
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
      <Link
        href={`/archetypes/${archetype.id}`}
        className="inline-block mt-5 text-[11px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)] transition-colors duration-300 hover:text-white reveal reveal-delay-2"
        style={{ color: "rgba(201,168,76,0.8)" }}
      >
        Study {archetype.name} in depth →
      </Link>

      <div className="mt-14 reveal reveal-delay-3">
        <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 font-[family-name:var(--font-body)]">
          PQ Score
        </p>
        <p className="font-[family-name:var(--font-heading)] text-7xl md:text-8xl font-bold text-gold glow-gold">
          {displayed}
        </p>
        <p className="text-text-muted/30 text-xs font-[family-name:var(--font-body)] mt-1">out of 100</p>
        <p className="text-text-muted/40 text-[11px] italic font-[family-name:var(--font-body)] mt-3 max-w-xs mx-auto leading-relaxed">
          How sharply defined your power signature is — not how much power you have. Every archetype can score high.
        </p>
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
        <p className="text-text-muted/70 text-sm md:text-[15px] leading-[1.8] font-[family-name:var(--font-body)] mt-4">
          {archetype.enemyTactics}
        </p>
        <Link
          href={`/archetypes/${enemy.id}`}
          className="inline-block mt-5 text-[11px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)] transition-colors duration-300 hover:text-white"
          style={{ color: "rgba(201,168,76,0.8)" }}
        >
          Study {enemy.name} →
        </Link>
      </div>
    </section>
  );
}

function ConfidenceSection({
  confidence,
  match,
  accent,
}: {
  confidence: ConfidenceReading;
  match: MatchResult;
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
      <p className="text-text-muted/35 text-[11px] font-[family-name:var(--font-body)] mt-3 tracking-wide">
        Fit {match.fit}% · runner-up {match.runnerUp.name} {match.runnerUpFit}% · gap {match.gap} pts
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
        No one is a pure type. Here&apos;s how your signature distributes across all 8 archetypes.
      </p>
      <div className="flex flex-col gap-4">
        {top.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-baseline justify-between mb-2">
              <Link
                href={`/archetypes/${entry.id}`}
                className="font-[family-name:var(--font-heading)] text-base md:text-lg font-semibold text-text-primary hover:underline underline-offset-4 decoration-1"
              >
                {entry.name}
              </Link>
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

function InteractionsSection({ scores, accent }: { scores: AxisScores; accent: string }) {
  const readings = useMemo(() => interactionReadings(scores), [scores]);
  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 text-center font-[family-name:var(--font-body)]">
        Where Your Axes Meet
      </p>
      <p className="text-text-muted/45 text-xs italic font-[family-name:var(--font-body)] text-center mb-7 max-w-sm mx-auto">
        An archetype is a combination, not four separate numbers. These are the two strongest pairings in your profile and the mechanism behind each.
      </p>
      <div className="flex flex-col gap-4">
        {readings.map((r, i) => (
          <div key={r.id} className="glass rounded-xl p-5 md:p-6 border-gradient">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-text-primary">
                {i + 1}. {r.label}
              </span>
              <span className="text-[10px] tracking-[0.15em] uppercase font-[family-name:var(--font-body)] font-semibold shrink-0" style={{ color: accent }}>
                {r.axes ? `${axisLabels[r.axes[0]]} × ${axisLabels[r.axes[1]]}` : "Whole profile"}
              </span>
            </div>
            <p className="text-text-muted/40 text-[10px] font-[family-name:var(--font-body)] mb-3">{r.framework}</p>
            <p className="text-text-primary/85 text-sm font-[family-name:var(--font-body)] leading-[1.7] mb-4">{r.mechanism}</p>
            <div className="space-y-3">
              <Reading label="Edge" body={r.edge} accent="#9BBF7B" />
              <Reading label="Risk" body={r.risk} accent="#E8A85A" />
              <Reading label="Move" body={r.move} accent={accent} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsistencySection({ accent }: { accent: string }) {
  const [result, setResult] = useState<ConsistencyResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pq_answers_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAnswer[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydration on mount
      setResult(evaluateContradictions(parsed));
    } catch { /* ignore */ }
  }, []);

  if (!result || result.answered === 0) return null;
  const shown = result.pairs.slice(0, 2);
  const tone = (a: ConsistencyResult["pairs"][number]["agreement"]) =>
    a === "contradiction" ? "#E8526A" : a === "consistent" ? "#9BBF7B" : "#E8A85A";
  const word = (a: ConsistencyResult["pairs"][number]["agreement"]) =>
    a === "contradiction" ? "Disagree" : a === "consistent" ? "Agree" : "Lean";

  return (
    <section>
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-2 text-center font-[family-name:var(--font-body)]">
        Answer Consistency
      </p>
      <p className="text-text-muted/45 text-xs italic font-[family-name:var(--font-body)] text-center mb-3 max-w-sm mx-auto">
        Eight pairs of questions ask the same thing two ways. When your answers disagree, that is not noise: it is an if-then signature, the situation deciding which version of you shows up.
      </p>
      <p className="text-center font-[family-name:var(--font-heading)] text-xl font-bold text-text-primary mb-6">
        {result.agreeing} of {result.answered} paired questions agree
      </p>
      <div className="flex flex-col gap-4">
        {shown.map((p) => (
          <div key={p.pairId} className="glass rounded-xl p-5 border-gradient" style={{ borderLeft: `2px solid ${tone(p.agreement)}` }}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-body)] font-semibold" style={{ color: tone(p.agreement) }}>
                {word(p.agreement)} · {p.construct}
              </span>
              <span className="text-[10px] tracking-[0.15em] uppercase font-[family-name:var(--font-body)]" style={{ color: accent }}>
                {axisLabels[p.axis]}
              </span>
            </div>
            <p className="text-text-primary/60 text-xs italic font-[family-name:var(--font-body)] mb-1">{p.questionA.prompt}</p>
            <p className="text-text-primary/95 text-sm font-[family-name:var(--font-body)] mb-3">&ldquo;{p.questionA.optionText}&rdquo;</p>
            <p className="text-text-primary/60 text-xs italic font-[family-name:var(--font-body)] mb-1">{p.questionB.prompt}</p>
            <p className="text-text-primary/95 text-sm font-[family-name:var(--font-body)] mb-3">&ldquo;{p.questionB.optionText}&rdquo;</p>
            <p className="text-text-muted/75 text-sm font-[family-name:var(--font-body)] leading-[1.7]">{p.reading}</p>
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
                {s.pullScore}% aligned
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

// ---------- Paid report: purchase state shared by every buy button ----------

interface PurchaseState {
  responseId: string | null;
  paid: boolean;
  /** true once the server has been asked whether this response is already paid. */
  checked: boolean;
}

/**
 * sessionStorage first (same tab), then a 48-hour localStorage fallback so a
 * revisit or a new tab can still buy — restricted to the same archetype so a
 * stale id can never be attached to someone else's result.
 */
function resolveResponseId(archetypeId: string): string | null {
  try {
    const fromSession = sessionStorage.getItem("pq_response_id");
    if (fromSession) return fromSession;
    const raw = localStorage.getItem(LAST_RESPONSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; archetypeId?: string; savedAt?: number };
    if (
      typeof parsed.id !== "string" ||
      parsed.archetypeId !== archetypeId ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > LAST_RESPONSE_MAX_AGE_MS
    ) return null;
    sessionStorage.setItem("pq_response_id", parsed.id);
    return parsed.id;
  } catch {
    return null;
  }
}

function usePurchaseState(archetypeId: string, saveStatus: SaveStatus): PurchaseState {
  const [state, setState] = useState<PurchaseState>({ responseId: null, paid: false, checked: false });

  useEffect(() => {
    let cancelled = false;
    const responseId = resolveResponseId(archetypeId);
    if (!responseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage hydration on mount
      setState({ responseId: null, paid: false, checked: true });
      return;
    }
    setState({ responseId, paid: false, checked: false });
    fetch(`/api/response/${encodeURIComponent(responseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (!cancelled) setState({ responseId, paid: body?.payment_status === "paid", checked: true }); })
      .catch(() => { if (!cancelled) setState({ responseId, paid: false, checked: true }); });
    return () => { cancelled = true; };
  }, [archetypeId, saveStatus]);

  return state;
}

function blockedMessage(saveStatus: SaveStatus): string {
  return saveStatus === "retrying"
    ? "Still saving your profile — give it a few seconds and try again."
    : saveStatus === "unsaved"
      ? "We could not store your profile a moment ago, so the report cannot be prepared yet. Refresh this page to retry."
      : "This link has lost its session. Retake the assessment to unlock the report.";
}

/** Starts hosted checkout. Resolves to an error message, or null once navigation has begun. */
async function openCheckout(responseId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/checkout/dodo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId }),
    });
    const text = await res.text();
    let body: { checkoutUrl?: string; error?: string } = {};
    try { body = JSON.parse(text); } catch { /* keep raw */ }
    if (!res.ok || !body.checkoutUrl) {
      console.error("[checkout] failed", res.status, text.slice(0, 300));
      return body.error ?? "Checkout is unavailable right now. Please try again in a moment.";
    }
    window.location.href = body.checkoutUrl;
    return null;
  } catch (err) {
    console.error("[checkout] network error", err);
    return "Could not reach the checkout. Check your connection and try again.";
  }
}

function useCheckout(purchase: PurchaseState, saveStatus: SaveStatus) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback(async () => {
    setError(null);
    if (!purchase.responseId) {
      setError(blockedMessage(saveStatus));
      return;
    }
    setLoading(true);
    const err = await openCheckout(purchase.responseId);
    if (err) {
      setError(err);
      setLoading(false);
    }
  }, [purchase.responseId, saveStatus]);
  return { loading, error, start };
}

const INCLUDED = [
  "The seven laws for your type",
  "Three ways you lose, named",
  "Your 90-day roadmap",
  "Every answer, scored",
  "Who amplifies and drains you",
  "Where your answers contradict",
];

function OwnedCard({ responseId, compact }: { responseId: string; compact?: boolean }) {
  return (
    <div className={`glass rounded-2xl border-gradient text-center ${compact ? "p-6" : "p-8 md:p-10"}`}>
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold/80 mb-3 font-[family-name:var(--font-body)]">
        You own this report
      </p>
      <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-5">
        Your full report is ready.
      </h3>
      <Link
        href={`/paid?response_id=${encodeURIComponent(responseId)}`}
        className="inline-block bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine"
      >
        Open my report
      </Link>
    </div>
  );
}

/** Compact buy card shown right after the verdict, where motivation peaks. */
function UnlockTeaser({ archetype, purchase, saveStatus }: { archetype: Archetype; purchase: PurchaseState; saveStatus: SaveStatus }) {
  const { loading, error, start } = useCheckout(purchase, saveStatus);
  if (purchase.paid && purchase.responseId) {
    return <section><OwnedCard responseId={purchase.responseId} compact /></section>;
  }
  return (
    <section>
      <div className="glass rounded-2xl p-6 md:p-7 border-gradient relative overflow-hidden" style={{ borderColor: `${archetype.cardAccent}40` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-accent/70 mb-1.5 font-[family-name:var(--font-body)]">
              Your full report
            </p>
            <h3 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-bold text-text-primary leading-tight">
              {PAID_REPORT_PAGES} pages on being {archetype.name.replace(/^The /, "a ")}.
            </h3>
          </div>
          <div className="text-right shrink-0">
            <p className="font-[family-name:var(--font-heading)] text-3xl font-bold text-gold leading-none">{REPORT_PRICE_LABEL}</p>
            <p className="text-[10px] text-text-muted/40 font-[family-name:var(--font-body)] mt-1">one-time</p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-5">
          {INCLUDED.map((item) => (
            <li key={item} className="text-xs text-text-primary/75 font-[family-name:var(--font-body)] leading-snug">
              <span style={{ color: archetype.cardAccent }}>· </span>{item}
            </li>
          ))}
        </ul>
        <button
          onClick={start}
          disabled={loading}
          className="w-full text-center bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-4 rounded-xl font-[family-name:var(--font-body)] transition-all duration-300 cursor-pointer glow-accent btn-shine"
        >
          {loading ? "Opening secure checkout…" : `Unlock Full Report — ${REPORT_PRICE_LABEL}`}
        </button>
        {error && <p className="text-accent text-xs mt-3 text-center font-[family-name:var(--font-body)]">{error}</p>}
        <p className="text-text-muted/40 text-[11px] mt-3 text-center italic font-[family-name:var(--font-body)]">
          Instant PDF · secure checkout · no subscription
        </p>
      </div>
    </section>
  );
}

/** Bottom bar that keeps the buy option on screen once the reader scrolls past the verdict. */
function StickyUnlockBar({ archetype, purchase, saveStatus }: { archetype: Archetype; purchase: PurchaseState; saveStatus: SaveStatus }) {
  const { loading, error, start } = useCheckout(purchase, saveStatus);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById("paid-report");
    let anchorInView = false;
    const update = () => setVisible(window.scrollY > 700 && !anchorInView);
    const observer = anchor
      ? new IntersectionObserver(([entry]) => { anchorInView = entry.isIntersecting; update(); }, { threshold: 0.15 })
      : null;
    if (anchor && observer) observer.observe(anchor);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", update); observer?.disconnect(); };
  }, []);

  if (!visible) return null;
  return (
    <div data-sticky-unlock className="fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pointer-events-none">
      <div
        className="max-w-lg mx-auto rounded-2xl px-4 py-3 pointer-events-auto"
        style={{
          background: "rgba(14,11,13,0.94)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.55)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 font-[family-name:var(--font-body)]">
              Full {PAID_REPORT_PAGES}-page report
            </p>
            <p className="text-sm font-[family-name:var(--font-heading)] font-bold text-text-primary truncate">
              {archetype.name} · {REPORT_PRICE_LABEL}, instant PDF
            </p>
          </div>
          {purchase.paid && purchase.responseId ? (
            <Link
              href={`/paid?response_id=${encodeURIComponent(purchase.responseId)}`}
              className="shrink-0 bg-accent hover:bg-accent-light text-white font-semibold text-sm px-5 py-3 rounded-xl font-[family-name:var(--font-body)] transition-colors"
            >
              Open report
            </Link>
          ) : (
            <button
              onClick={start}
              disabled={loading}
              className="shrink-0 bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-semibold text-sm px-5 py-3 rounded-xl font-[family-name:var(--font-body)] transition-colors cursor-pointer glow-accent"
            >
              {loading ? "Opening…" : "Unlock"}
            </button>
          )}
        </div>
        {error && <p className="text-accent text-[11px] mt-2 font-[family-name:var(--font-body)]">{error}</p>}
      </div>
    </div>
  );
}

function UpsellSection({
  archetype,
  scores,
  pq,
  saveStatus,
  purchase,
}: {
  archetype: Archetype;
  scores: Record<AxisId, number>;
  pq: number;
  saveStatus: SaveStatus;
  purchase: PurchaseState;
}) {
  return (
    <section className="flex flex-col gap-8">
      <PaidUnlockCard archetype={archetype} saveStatus={saveStatus} purchase={purchase} />
      <FreePdfSection archetype={archetype} scores={scores} pq={pq} />
    </section>
  );
}

const REPORT_CONTENTS = [
  "Standard profile sheet: 25 variables, same layout for everyone",
  "Four per-axis deep dives with the answers that produced each score",
  "How you win, how you lose, and the shadow gift",
  "Who amplifies you, who drains you, and your natural enemy's playbook",
  "The seven laws and a 90-day roadmap for your type",
  "Where your axes interact and where your answers contradict",
  "Every one of your 27 answers, scored and cited to its framework",
  "A personal closing letter, watermarked to you",
];

function PaidUnlockCard({ archetype, saveStatus, purchase }: { archetype: Archetype; saveStatus: SaveStatus; purchase: PurchaseState }) {
  const { loading, error, start } = useCheckout(purchase, saveStatus);

  if (purchase.paid && purchase.responseId) {
    return <div id="paid-report"><OwnedCard responseId={purchase.responseId} /></div>;
  }

  return (
    <div id="paid-report" className="glass rounded-2xl p-7 md:p-10 border-gradient relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px]" />
      <div className="relative">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-[family-name:var(--font-body)]">
            Full PQ Report — {REPORT_PRICE_LABEL}
          </p>
          <h3 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Unlock your full analysis.
          </h3>
          <p className="text-text-muted/50 text-sm mb-6 font-[family-name:var(--font-body)] max-w-sm mx-auto">
            {PAID_REPORT_PAGES} pages built from your 27 answers. Same structure for every reader, so you can compare with anyone who takes it.
          </p>
        </div>

        {/* Locked preview: the first failure mode in full, the rest blurred. */}
        <div className="relative rounded-xl p-5 mb-6 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] tracking-[0.25em] uppercase text-text-muted/50 mb-3 font-[family-name:var(--font-body)]">
            From your report · How {archetype.name.replace(/^The /, "the ")} loses
          </p>
          {archetype.loseModes.map((mode, i) => (
            <div key={i} className="mb-3">
              <p className="text-sm font-[family-name:var(--font-heading)] font-bold text-text-primary">{i + 1}. {mode.label}</p>
              <p
                className="text-sm text-text-muted/70 font-[family-name:var(--font-body)] leading-relaxed"
                style={i === 0 ? undefined : { filter: "blur(5px)", userSelect: "none" }}
                aria-hidden={i !== 0}
              >
                {mode.text}
              </p>
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: "linear-gradient(transparent, rgba(12,10,12,0.96))" }} />
          <p className="absolute bottom-3 inset-x-0 text-center text-[10px] tracking-[0.2em] uppercase text-gold/80 font-[family-name:var(--font-body)]">
            Two more inside, plus 24 pages
          </p>
        </div>

        <ul className="space-y-1.5 mb-7">
          {REPORT_CONTENTS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-text-primary/80 font-[family-name:var(--font-body)] leading-snug">
              <span className="mt-[2px] shrink-0" style={{ color: archetype.cardAccent }}>✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={start}
          disabled={loading}
          className="w-full text-center bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-xl font-[family-name:var(--font-body)] transition-all duration-300 cursor-pointer glow-accent btn-shine"
        >
          {loading ? "Opening secure checkout…" : `Unlock Full Report — ${REPORT_PRICE_LABEL}`}
        </button>
        {error && (
          <p className="text-accent text-xs mt-3 text-center font-[family-name:var(--font-body)]">{error}</p>
        )}
        <p className="text-text-muted/40 text-[11px] mt-4 text-center font-[family-name:var(--font-body)] italic">
          Secure checkout by Dodo Payments · instant PDF · one-time, no subscription · if it fails to generate, full refund.
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
  // The email was already captured on the final quiz step, so the free
  // summary is a direct download — no second form.
  const [token, setToken] = useState("");
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("pq_response_id");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydration on mount
      if (id) setToken(id.slice(0, 8));
    } catch { /* ignore */ }
  }, []);

  const qs = new URLSearchParams({
    id: archetype.id,
    c: String(scores.control),
    v: String(scores.visibility),
    t: String(scores.timeHorizon),
    p: String(scores.powerSource),
    pq: String(pq),
  });
  if (token) qs.set("token", token);
  const downloadUrl = `/api/pdf/free?${qs.toString()}`;

  return (
    <div className="glass rounded-2xl p-8 md:p-10 border-gradient text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted/40 mb-3 font-[family-name:var(--font-body)]">
        Free 4-Page Summary
      </p>
      <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2">
        Your summary is ready.
      </h3>
      <p className="text-text-muted/50 text-sm mb-6 font-[family-name:var(--font-body)] max-w-sm mx-auto">
        Your archetype, four axes, natural enemy, and the pattern to guard against. Same layout for everyone, so you can compare with friends.
      </p>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-accent hover:bg-accent-light text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine"
      >
        Open the free PDF
      </a>
      <p className="text-text-muted/30 text-[10px] mt-4 font-[family-name:var(--font-body)]">
        Opens in a new tab. Save it from there.
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
        <Link
          href="/archetypes"
          className="glass glass-hover text-text-primary/70 text-sm px-5 py-3 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)]"
        >
          Explore all 8 archetypes
        </Link>
      </div>
    </section>
  );
}
