"use client";

import { useEffect } from "react";

/**
 * Last line of defence: replaces the root layout when the layout itself
 * throws. It gets no global styles or fonts, so everything is inline.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[root-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#080808", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <title>Something went wrong | PQ</title>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 440 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", color: "#E8526A", marginBottom: 20 }}>Something went wrong</p>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 16px" }}>The site hit an error.</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 32 }}>
              Nothing you entered has been lost — quiz progress stays on this device for 48 hours.
              {error.digest ? ` Reference: ${error.digest}.` : ""}
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: "#C41E3A", color: "#fff", border: 0, borderRadius: 12, padding: "14px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <p style={{ marginTop: 24 }}>
              {/* A plain anchor on purpose: the app router may be the thing that broke. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>Back to home</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
