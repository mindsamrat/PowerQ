"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PaidStatus {
  status: "checking" | "paid" | "pending" | "error";
  pdfUrl?: string;
  message?: string;
}

export default function PaidPageWrapper() {
  return (
    <Suspense fallback={null}>
      <PaidPage />
    </Suspense>
  );
}

function PaidPage() {
  const params = useSearchParams();
  const responseId = params.get("response_id") ?? params.get("responseId") ?? "";
  const [state, setState] = useState<PaidStatus>({ status: "checking" });

  useEffect(() => {
    if (!responseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration
      setState({ status: "error", message: "Missing response id in the return URL." });
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/response/${encodeURIComponent(responseId)}`);
        const body = await res.json();
        if (cancelled) return;

        if (body.payment_status === "paid") {
          setState({
            status: "paid",
            pdfUrl: `/api/pdf/paid?id=${encodeURIComponent(responseId)}`,
          });
          return;
        }

        if (attempts >= 12) {
          // ~36 seconds elapsed. Webhook usually fires within 5s. Show a
          // graceful 'still processing' state instead of polling forever.
          setState({
            status: "pending",
            message: "Your payment was received. The report is being prepared and will land in your inbox shortly.",
          });
          return;
        }

        window.setTimeout(poll, 3000);
      } catch {
        if (cancelled) return;
        setState({ status: "error", message: "We couldn't verify the payment. Email hello@wayofgods.com if this persists." });
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [responseId]);

  return (
    <main
      className="min-h-screen relative grain text-white flex items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(ellipse 120% 70% at 50% -5%, rgba(196,30,58,0.18), transparent 55%), radial-gradient(ellipse 80% 60% at 50% 105%, rgba(201,168,76,0.12), transparent 60%), linear-gradient(180deg, #0F0B0D 0%, #0A0A0A 100%)",
      }}
    >
      <div className="max-w-md w-full text-center">
        {state.status === "checking" && (
          <>
            <div className="w-12 h-12 mx-auto mb-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-text-muted/40 mb-4 font-[family-name:var(--font-body)]">
              Verifying Payment
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-3">
              Hold a moment.
            </h1>
            <p className="text-text-muted/60 text-sm font-[family-name:var(--font-body)]">
              Confirming with the payment processor and preparing your report.
            </p>
          </>
        )}

        {state.status === "paid" && (
          <>
            <p className="text-[10px] tracking-[0.4em] uppercase text-gold/80 mb-5 font-[family-name:var(--font-body)]">
              Payment Confirmed
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold text-text-primary mb-4 glow-text">
              Your report is ready.
            </h1>
            <p className="text-text-muted/60 text-sm md:text-base mb-10 font-[family-name:var(--font-body)] leading-relaxed">
              The full PQ Power Profile — your archetype across love, money, conflict, and legacy — is below. We've also emailed you a copy.
            </p>
            <a
              href={state.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent hover:bg-accent-light text-white font-semibold text-base py-4 px-10 rounded-xl transition-all duration-300 font-[family-name:var(--font-body)] glow-accent btn-shine"
            >
              Open My Full Report
            </a>
          </>
        )}

        {state.status === "pending" && (
          <>
            <p className="text-[10px] tracking-[0.4em] uppercase text-gold/80 mb-5 font-[family-name:var(--font-body)]">
              Payment Received
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Report incoming.
            </h1>
            <p className="text-text-muted/60 text-sm md:text-base mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              {state.message}
            </p>
            <Link
              href="/"
              className="inline-block text-text-muted/60 hover:text-text-muted text-sm font-[family-name:var(--font-body)]"
            >
              Back to home
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <p className="text-[10px] tracking-[0.4em] uppercase text-accent/80 mb-5 font-[family-name:var(--font-body)]">
              Something went wrong
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-text-primary mb-4">
              We couldn't confirm your payment.
            </h1>
            <p className="text-text-muted/60 text-sm mb-8 font-[family-name:var(--font-body)] leading-relaxed">
              {state.message}
            </p>
            <Link
              href="/"
              className="inline-block text-text-muted/60 hover:text-text-muted text-sm font-[family-name:var(--font-body)]"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
