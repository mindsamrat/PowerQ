import { createHash, timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase-server";
import { analysePsychometrics, type PsychometricReport, type ResponseSample } from "@/lib/psychometrics";
import { axisLabels, type AxisId } from "@/data/archetypes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "PQ Psychometrics",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Token-gated instrument dashboard. Unknown or missing token renders the
 * ordinary 404 so the page's existence is never confirmed to outsiders.
 * Loads no personal data: only answers, scores, archetype and timestamps.
 */
/** A token shorter than this is too easy to guess; the page stays disabled. */
const MIN_TOKEN_LENGTH = 16;

function tokenOk(given: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || expected.length < MIN_TOKEN_LENGTH || !given) return false;
  // Hashing first makes the comparison constant-time regardless of length.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Hard ceiling so a runaway table cannot exhaust the function; the page says when it is hit. */
const MAX_ROWS = 100_000;

async function fetchRows(): Promise<{ rows: ResponseSample[]; truncated: boolean }> {
  const sb = getServerSupabase();
  if (!sb) return { rows: [], truncated: false };
  const out: ResponseSample[] = [];
  const page = 1000;
  // Newest first, so a capped read still describes the current population.
  for (let from = 0; from < MAX_ROWS; from += page) {
    const { data, error } = await sb
      .from("responses")
      .select("id, archetype_id, pq_score, scores, answers, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as ResponseSample[]));
    if (data.length < page) break;
  }
  return { rows: out.reverse(), truncated: out.length >= MAX_ROWS };
}

const AXES: AxisId[] = ["control", "visibility", "timeHorizon", "powerSource"];

export default async function PsychometricsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!tokenOk(token)) notFound();

  let report: PsychometricReport | null = null;
  let error: string | null = null;
  let truncated = false;
  if (!isSupabaseConfigured()) {
    error = "Supabase is not configured in this environment, so there is nothing to analyse.";
  } else {
    try {
      const fetched = await fetchRows();
      truncated = fetched.truncated;
      report = analysePsychometrics(fetched.rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      error = /fetch failed|ECONNREFUSED|ENOTFOUND|timeout/i.test(msg)
        ? "The database did not answer. The Supabase project is most likely paused — restore it in the Supabase dashboard and reload this page."
        : `Could not load responses: ${msg}`;
    }
  }

  return (
    <main style={{ background: "#0A0A0A", color: "#EDE7DA", minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(201,168,76,0.85)", marginBottom: 8 }}>PQ · Instrument Dashboard</p>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 6px" }}>Psychometrics</h1>
        <p style={{ color: "rgba(237,231,218,0.55)", fontSize: 13, margin: "0 0 28px", maxWidth: 720, lineHeight: 1.6 }}>
          Does each question measure what it claims, do the four axes hold together, and does the real population look like the seeded one?
          Numbers firm up around 100 responses; norms are meaningful from 300.
        </p>

        {error && (
          <Box><p style={{ color: "#E8A85A", margin: 0 }}>{error}</p></Box>
        )}

        {report && (
          <>
            <Box>
              <h2 style={h2}>Sample</h2>
              <p style={{ margin: 0, fontSize: 14 }}>
                <b>{report.n}</b> responses analysed{report.from ? ` · ${report.from.slice(0, 10)} → ${report.to?.slice(0, 10)}` : ""}
                {truncated ? ` · capped at the newest ${MAX_ROWS.toLocaleString()} rows` : " · every stored response"}
              </p>
            </Box>

            {report.notes.length > 0 && (
              <Box accent="#E8A85A">
                <h2 style={h2}>What the data says to do</h2>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  {report.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </Box>
            )}

            <Box>
              <h2 style={h2}>Archetype distribution</h2>
              <Table
                head={["Archetype", "Count", "Observed %", "Seeded rarity %", "Gap"]}
                rows={report.archetypes.map((a) => [a.name, String(a.count), `${a.observedPct}`, `${a.seededPct}`, fmtGap(a.observedPct - a.seededPct)])}
              />
            </Box>

            <Box>
              <h2 style={h2}>Axis scores</h2>
              <Table
                head={["Axis", "n", "Mean", "SD", "p10", "p25", "p50", "p75", "p90"]}
                rows={AXES.map((ax) => { const d = report.axes[ax]; return [axisLabels[ax], String(d.n), String(d.mean), String(d.sd), ...["p10", "p25", "p50", "p75", "p90"].map((p) => String(d.percentiles[p]))]; })}
              />
              <p style={small}>A healthy axis has SD around 12–18 and a median near 50. A median far from 50 means the bank leans one way on that axis.</p>
              <Table
                head={["PQ", "n", "Mean", "SD", "p10", "p50", "p90"]}
                rows={[["Signature Definition", String(report.pq.n), String(report.pq.mean), String(report.pq.sd), String(report.pq.percentiles.p10), String(report.pq.percentiles.p50), String(report.pq.percentiles.p90)]]}
              />
              <p style={{ ...small, marginBottom: 0 }}>
                Confidence: Strong {pct(report.confidence.high, report.n)} · Clear {pct(report.confidence.moderate, report.n)} · Borderline {pct(report.confidence.borderline, report.n)}
              </p>
            </Box>

            <Box>
              <h2 style={h2}>Reliability (Cronbach&apos;s alpha, always-served items)</h2>
              <Table
                head={["Axis", "Items", "n", "Alpha", "Read"]}
                rows={report.reliability.map((r) => [axisLabels[r.axis], String(r.items), String(r.n), r.alpha === null ? "—" : String(r.alpha), r.alpha === null ? "need ≥30 complete" : r.alpha >= 0.7 ? "good" : r.alpha >= 0.6 ? "acceptable" : "low"])}
              />
              <p style={{ ...small, marginBottom: 0 }}>Alpha asks whether the questions on an axis agree with each other. Above 0.7 is what published scales aim for; below 0.6 the axis needs sharper items.</p>
            </Box>

            <Box>
              <h2 style={h2}>Item analysis</h2>
              <Table
                head={["Q", "Primary axis", "n", "r (primary)", "Verdict", "Option shares a/b/c/d", "Position shares 1/2/3/4", "Pos. bias"]}
                rows={report.items.map((it) => [
                  it.id,
                  it.primaryAxis ? axisLabels[it.primaryAxis] : "—",
                  String(it.n),
                  it.primaryR === null ? "—" : String(it.primaryR),
                  it.verdict,
                  ["a", "b", "c", "d"].map((k) => it.optionShares[k] ?? 0).join(" / "),
                  it.positionShares ? ["0", "1", "2", "3"].map((k) => it.positionShares![k] ?? 0).join(" / ") : "—",
                  it.positionBias === null ? "—" : String(it.positionBias),
                ])}
              />
              <p style={{ ...small, marginBottom: 0 }}>
                r (primary) is the corrected item-total correlation: does choosing this question&apos;s &ldquo;high&rdquo; option go with scoring high on that axis on the <i>other</i> questions? Good items sit above 0.3; below 0.15 the item adds noise; negative means it is pulling the wrong way.
                Position shares should hover around 25 each now that options are shuffled; a slot far above that is a real position effect.
              </p>
            </Box>

            <Box>
              <h2 style={h2}>Paired-question consistency</h2>
              <Table
                head={["Pair", "Probes", "n", "Agree %", "Contradict %"]}
                rows={report.pairs.map((p) => [p.id, p.construct, String(p.n), p.agreementRate === null ? "—" : String(p.agreementRate), p.contradictionRate === null ? "—" : String(p.contradictionRate)])}
              />
              <p style={{ ...small, marginBottom: 0 }}>Pairs are meant to agree for most people. A pair that contradicts for a third or more of respondents is probably measuring two different things and should be re-paired.</p>
            </Box>

            <Box>
              <h2 style={h2}>Proposed norms (percentile per axis)</h2>
              <Table
                head={["Axis", ...Array.from({ length: 19 }, (_, i) => `p${(i + 1) * 5}`)]}
                rows={AXES.map((ax) => [axisLabels[ax], ...Array.from({ length: 19 }, (_, i) => String(report.norms[ax][`p${(i + 1) * 5}`] ?? "—"))])}
                compact
              />
              <p style={{ ...small, marginBottom: 0 }}>Once n ≥ 300, these become the lookup table for &ldquo;you score higher than X% of respondents&rdquo; and replace the seeded 5–95 mapping.</p>
            </Box>

            <details style={{ marginTop: 20 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "rgba(237,231,218,0.5)" }}>Raw JSON (paste this to have the analysis interpreted)</summary>
              <pre style={{ fontSize: 10, background: "#111", padding: 12, overflowX: "auto", borderRadius: 6, color: "rgba(237,231,218,0.8)" }}>{JSON.stringify(report, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    </main>
  );
}

const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: "#EDE7DA" };
const small: React.CSSProperties = { fontSize: 12, color: "rgba(237,231,218,0.55)", lineHeight: 1.6, margin: "10px 0 16px" };

function pct(v: number, n: number): string {
  return n ? `${Math.round((100 * v) / n)}%` : "—";
}
function fmtGap(g: number): string {
  const r = Math.round(g * 10) / 10;
  return r > 0 ? `+${r}` : String(r);
}

function Box({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <section style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${accent ? accent + "55" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
      {children}
    </section>
  );
}

function Table({ head, rows, compact }: { head: string[]; rows: string[][]; compact?: boolean }) {
  const cell: React.CSSProperties = { padding: compact ? "4px 6px" : "7px 10px", fontSize: compact ? 11 : 12.5, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={{ ...cell, textAlign: "left", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.85)", borderBottom: "1px solid rgba(201,168,76,0.4)" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
              {r.map((c, j) => <td key={j} style={{ ...cell, color: j === 0 ? "#EDE7DA" : "rgba(237,231,218,0.8)", fontWeight: j === 0 ? 600 : 400 }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
