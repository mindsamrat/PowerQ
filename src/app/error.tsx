"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel's function / browser logs; nothing sensitive is shown to the user.
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase mb-5 font-[family-name:var(--font-body)]" style={{ color: "rgba(196,30,58,0.9)" }}>
          Something went wrong
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold mb-4">
          A page failed to load.
        </h1>
        <p className="text-sm font-[family-name:var(--font-body)] mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your progress in the assessment is saved on this device for 48 hours. Try again, or return home.
          {error.digest ? ` Reference: ${error.digest}.` : ""}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="bg-[#C41E3A] hover:bg-[#E8526A] text-white font-semibold text-sm py-3.5 px-8 rounded-xl transition-colors duration-300 font-[family-name:var(--font-body)] cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm py-3.5 px-6 rounded-xl font-[family-name:var(--font-body)] transition-colors duration-300"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
