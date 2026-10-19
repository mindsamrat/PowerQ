"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SUPPORT_EMAIL = "hello@wayofgods.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Keep checking for this long before asking the buyer to come back later. */
const POLL_WINDOW_MS = 4 * 60 * 1000;
/** Dodo's return status values that mean no money moved. */
const FAILED_STATUSES = new Set(["failed", "cancelled", "canceled", "declined", "expired", "requires_payment_method"]);

type View =
  | { kind: "checking" }
  | { kind: "paid"; archetypeId: string | null; scores: ScoreParams | null }
  | { kind: "still-confirming"; scores: ScoreParams | null }
  | { kind: "not-paid"; scores: ScoreParams | null }
  | { kind: "revoked"; scores: ScoreParams | null }
  | { kind: "missing" }
  | { kind: "invalid" };

interface ScoreParams { id: string; c: number; v: number; t: number; p: number; pq: number }

interface ResponseStatus {
  archetype_id?: unknown;
  pq_score?: unknown;
  scores?: unknown;
  payment_status?: unknown;
}

/** The results link for this response, rebuilt from the stored scores. */
function scoreParams(body: ResponseStatus): ScoreParams | null {
  const s = body.scores && typeof body.scores === "object" ? (body.scores as Record<string, unknown>) : null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(100, v))) : null);
  const c = num(s?.control), v = num(s?.visibility), t = num(s?.timeHorizon), p = num(s?.powerSource), pq = num(body.pq_score);
  if (typeof body.archetype_id !== "string" || c === null || v === null || t === null || p === null || pq === null) return null;
  return { id: body.archetype_id, c, v, t, p, pq };
}

function resultsHref(s: ScoreParams | null): string | null {
  if (!s) return null;
  return `/results?${new URLSearchParams({ id: s.id, c: String(s.c), v: String(s.v), t: String(s.t), p: String(s.p), pq: String(s.pq) })}`;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function PaidPageWrapper() {
  return (
    <Suspense fallback={null}>
      <PaidPage />
    </Suspense>
  );
}

function PaidPage() {
  const params = useSearchParams();
  const rawId = params.get("response_id") ?? params.get("responseId") ?? "";
  const responseId = UUID_RE.test(rawId) ? rawId.toLowerCase() : null;
  const paymentId = params.get("payment_id");
  const returnStatus = (params.get("status") ?? "").toLowerCase();
  const [view, setView] = useState<View>({ kind: "checking" });
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!responseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration
      setView({ kind: "invalid" });
      return;
    }

    let cancelled = false;
    setView({ kind: "checking" });

    (async () => {
      const started = Date.now();
      let polls = 0;
      let verifyAttempts = 0;
      let lastScores: ScoreParams | null = null;
      let dodoSaysFailed = FAILED_STATUSES.has(returnStatus);

      while (!cancelled && Date.now() - started < POLL_WINDOW_MS) {
        polls += 1;
        // Status read. A network error, timeout, 503 or odd body is never
        // the end: the webhook may land on the very next poll.
        try {
          const res = await fetch(`/api/response/${encodeURIComponent(responseId)}`, { signal: AbortSignal.timeout(10000), cache: "no-store" });
          if (res.status === 404) {
            if (!cancelled) setView({ kind: "missing" });
            return;
          }
          if (res.ok) {
            const body = (await res.json()) as ResponseStatus;
            lastScores = scoreParams(body) ?? lastScores;
            if (body.payment_status === "paid") {
              if (!cancelled) setView({ kind: "paid", archetypeId: typeof body.archetype_id === "string" ? body.archetype_id : null, scores: lastScores });
              return;
            }
            if (body.payment_status === "failed" || body.payment_status === "cancelled") dodoSaysFailed = true;
            if (body.payment_status === "refunded" || body.payment_status === "charged_back" || body.payment_status === "disputed") {
              if (!cancelled) setView({ kind: "revoked", scores: lastScores });
              return;
            }
          }
        } catch { /* keep polling */ }

        if (dodoSaysFailed) {
          if (!cancelled) setView({ kind: "not-paid", scores: lastScores });
          return;
        }

        // Dodo said "succeeded" on the way back but the webhook hasn't
        // arrived: ask the server to confirm with Dodo directly.
        if (returnStatus === "succeeded" && paymentId && polls >= 2 && verifyAttempts < 4 && polls % 2 === 0) {
          verifyAttempts += 1;
          try {
            const res = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ responseId, paymentId }),
              signal: AbortSignal.timeout(20000),
            });
            const body = (await res.json().catch(() => ({}))) as { paid?: unknown; status?: unknown };
            if (res.status === 404) {
              if (!cancelled) setView({ kind: "missing" });
              return;
            }
            if (res.ok && body.paid === true) {
              if (!cancelled) setView({ kind: "paid", archetypeId: null, scores: lastScores });
              return;
            }
            if (res.ok && typeof body.status === "string" && FAILED_STATUSES.has(body.status)) dodoSaysFailed = true;
          } catch { /* try again on a later poll */ }
        }

        // Quick while the webhook is most likely to land, then ease off.
        await sleep(polls < 10 ? 2000 : polls < 30 ? 5000 : 10000);
      }
      if (!cancelled) setView({ kind: "still-confirming", scores: lastScores });
    })();

    return () => { cancelled = true; };
  }, [responseId, paymentId, returnStatus, round]);

  const checkAgain = useCallback(() => setRound((r) => r + 1), []);

  return (
    <main
      className="min-h-screen relative grain text-white flex items-center justify-center px-6 py-16"
      style={{
        background:
          "radial-gradient(ellipse 120% 70% at 50% -5%, rgba(196,30,58,0.18), transparent 55%), radial-gradient(ellipse 80% 60% at 50% 105%, rgba(201,168,76,0.12), transparent 60%), linear-gradient(180deg, #0F0B0D 0%, #0A0A0A 100%)",
      }}
    >
      <div className="max-w-md w-full text-center" aria-live="polite">
        {view.kind === "checking" && (
          <>
            <div className="w-12 h-12 mx-auto mb-8 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
            <Eyebrow>Confirming payment</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-3">
              Hold a moment.
            </h1>
            <p className="text-text-muted text-sm font-[family-name:var(--font-body)]">
              Checking with the payment processor and preparing your report. This usually takes a few seconds.
            </p>
          </>
        )}

        {view.kind === "paid" && responseId && <PaidView responseId={responseId} archetypeId={view.archetypeId} resultsLink={resultsHref(view.scores)} />}

        {view.kind === "still-confirming" && (
          <>
            <Eyebrow tone="gold">Still confirming</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Your payment is still being confirmed.
            </h1>
            <p className="text-text-muted text-sm md:text-base mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              This can take a few minutes on a slow connection. You won&apos;t be charged twice. Keep this page open, or come back to this exact link later — it keeps working.
            </p>
            <PrimaryButton onClick={checkAgain}>Check again</PrimaryButton>
            <SupportLine responseId={responseId} resultsLink={resultsHref(view.scores)} />
          </>
        )}

        {view.kind === "not-paid" && responseId && (
          <>
            <Eyebrow tone="accent">Payment not completed</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-4">
              The payment didn&apos;t go through.
            </h1>
            <p className="text-text-muted text-sm md:text-base mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              You weren&apos;t charged. Your result is still saved, so you can try again whenever you like.
            </p>
            <RetryCheckout responseId={responseId} />
            <SupportLine responseId={responseId} resultsLink={resultsHref(view.scores)} />
          </>
        )}

        {view.kind === "revoked" && (
          <>
            <Eyebrow tone="accent">Report unavailable</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-4">
              This purchase was refunded or is under dispute.
            </h1>
            <p className="text-text-muted text-sm md:text-base mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              The report can no longer be downloaded from this link. If that&apos;s a mistake, email us and we&apos;ll put it right.
            </p>
            <SupportLine responseId={responseId} resultsLink={resultsHref(view.scores)} />
          </>
        )}

        {view.kind === "missing" && (
          <>
            <Eyebrow tone="accent">Result not found</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-text-primary mb-4">
              We can&apos;t find a result for this link.
            </h1>
            <p className="text-text-muted text-sm mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              The link may be incomplete or older than our records. If you paid, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold-light underline underline-offset-4">{SUPPORT_EMAIL}</a>{" "}
              with the email you used at checkout and we&apos;ll sort it out.
            </p>
            <Link href="/quiz" className="inline-block text-text-muted hover:text-text-primary text-sm font-[family-name:var(--font-body)] underline underline-offset-4">
              Take the assessment
            </Link>
          </>
        )}

        {view.kind === "invalid" && (
          <>
            <Eyebrow tone="accent">Something&apos;s missing</Eyebrow>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-text-primary mb-4">
              This link is incomplete.
            </h1>
            <p className="text-text-muted text-sm mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              It doesn&apos;t contain a result reference. If you arrived here after paying, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold-light underline underline-offset-4">{SUPPORT_EMAIL}</a>{" "}
              with the email you used at checkout.
            </p>
            <Link href="/" className="inline-block text-text-muted hover:text-text-primary text-sm font-[family-name:var(--font-body)] underline underline-offset-4">
              Back to home
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function Eyebrow({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "accent" }) {
  const color = tone === "gold" ? "text-gold-light" : tone === "accent" ? "text-accent-light" : "text-text-muted";
  return <p className={`text-[10px] tracking-[0.4em] uppercase mb-5 font-[family-name:var(--font-body)] ${color}`}>{children}</p>;
}

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

function PrimaryButton({ children, onClick, disabled, href, download }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; href?: string; download?: boolean }) {
  const cls = `inline-block bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-wait text-white font-semibold text-base py-4 px-10 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine cursor-pointer ${FOCUS_RING}`;
  if (href) return <a href={href} className={cls} {...(download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}>{children}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

function PaidView({ responseId, archetypeId, resultsLink }: { responseId: string; archetypeId: string | null; resultsLink: string | null }) {
  const pdfUrl = `/api/pdf/paid?id=${encodeURIComponent(responseId)}`;
  return (
    <>
      <Eyebrow tone="gold">Payment confirmed</Eyebrow>
      <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold text-text-primary mb-4 glow-text">
        Your report is ready.
      </h1>
      <p className="text-text-muted text-sm md:text-base mb-10 font-[family-name:var(--font-body)] leading-relaxed">
        The full PQ Power Profile — your verdict, four-axis deep dives, how you win, how you lose, your pairings and a 90-day roadmap — is built and waiting.
      </p>
      <PrimaryButton href={`${pdfUrl}&download=1`} download>Download My Full Report (PDF)</PrimaryButton>
      <p className="mt-4">
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={`text-text-muted hover:text-text-primary text-xs tracking-wide font-[family-name:var(--font-body)] underline underline-offset-4 decoration-1 rounded ${FOCUS_RING}`}>
          Open it in the browser instead
        </a>
      </p>
      <p className="text-text-muted text-xs mt-6 font-[family-name:var(--font-body)] leading-relaxed max-w-sm mx-auto">
        Save the PDF somewhere safe. This page link keeps working too, so you can come back and download it again.
        {resultsLink && (
          <>
            {" "}<Link href={resultsLink} className="underline underline-offset-4 hover:text-text-primary">Back to your result</Link>.
          </>
        )}
      </p>

      <div className="mt-14 pt-8 border-t border-divider-dark">
        <p className="text-[10px] tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-body)] text-gold-light">
          Next: the playbook
        </p>
        <p className="text-text-muted text-sm font-[family-name:var(--font-body)] leading-relaxed mb-5 max-w-sm mx-auto">
          The report is the diagnosis. Sovereign Doctrine is the instruction manual, written for your archetype and the seven you have to deal with.
        </p>
        <a
          href={`/book?from=paid${archetypeId ? `&archetype=${encodeURIComponent(archetypeId)}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block font-semibold text-sm py-3.5 px-8 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] btn-shine ${FOCUS_RING}`}
          style={{ background: "rgba(201,168,76,1)", color: "#0A0A0A", boxShadow: "0 0 24px rgba(201,168,76,0.3)" }}
        >
          Get Sovereign Doctrine
        </a>
      </div>
    </>
  );
}

/** Opens a fresh Dodo checkout for the same saved result. */
function RetryCheckout({ responseId }: { responseId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const retry = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/dodo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId }),
        signal: AbortSignal.timeout(25000),
      });
      const body = (await res.json().catch(() => ({}))) as { checkoutUrl?: unknown; error?: unknown };
      if (res.ok && typeof body.checkoutUrl === "string") {
        window.location.assign(body.checkoutUrl);
        return; // leave the button disabled while the browser navigates
      }
      setError(typeof body.error === "string" ? body.error : "Checkout couldn't be opened. Please try again in a moment.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    busyRef.current = false;
    setBusy(false);
  };

  return (
    <>
      <PrimaryButton onClick={retry} disabled={busy}>{busy ? "Opening secure checkout…" : "Try again"}</PrimaryButton>
      <p role="alert" className="text-accent-light text-xs mt-4 font-[family-name:var(--font-body)] min-h-[1rem]">{error}</p>
    </>
  );
}

function SupportLine({ responseId, resultsLink }: { responseId: string | null; resultsLink: string | null }) {
  return (
    <p className="text-text-muted text-xs mt-8 font-[family-name:var(--font-body)] leading-relaxed max-w-sm mx-auto">
      {resultsLink && (
        <>
          <Link href={resultsLink} className="underline underline-offset-4 hover:text-text-primary">Back to your result</Link>
          {" · "}
        </>
      )}
      Need help? Email{" "}
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`PQ report${responseId ? ` ${responseId.slice(0, 8)}` : ""}`)}`} className="underline underline-offset-4 hover:text-text-primary">
        {SUPPORT_EMAIL}
      </a>
      {responseId && <> and quote <span className="font-mono">{responseId.slice(0, 8)}</span></>}.
    </p>
  );
}
