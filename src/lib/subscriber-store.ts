import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/**
 * LOCAL DEVELOPMENT ONLY. When Supabase env vars are absent on a developer
 * machine, completions are appended to an NDJSON file in the OS temp dir so
 * the flow can be exercised end to end. Production never uses this: a missing
 * Supabase config in production is treated as an outage (degraded result,
 * loud log), not as a reason to invent a response id.
 */
export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && !!process.env.VERCEL);
}

const STORE_PATH = join(tmpdir(), "pq-dev-subscribers.ndjson");

export async function recordDevSubscriber(data: { email: string; archetypeId: string; pq: number }): Promise<string> {
  const id = randomUUID();
  try {
    await fs.appendFile(STORE_PATH, JSON.stringify({ id, ...data, createdAt: new Date().toISOString() }) + "\n", "utf8");
  } catch (err) {
    console.warn("[dev-store] could not persist record:", err instanceof Error ? err.message : err);
  }
  return id;
}
