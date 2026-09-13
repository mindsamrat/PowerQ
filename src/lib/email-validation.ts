import mailchecker from "mailchecker";
import { promises as dns } from "node:dns";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidation {
  valid: boolean;
  normalized?: string;
  error?: string;
}

export function validateEmailFormat(raw: string): EmailValidation {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return { valid: false, error: "Enter your email." };
  if (trimmed.length > 254) return { valid: false, error: "That email is too long." };
  if (!EMAIL_RE.test(trimmed)) return { valid: false, error: "That doesn't look like a valid email." };

  // mailchecker covers ~120k disposable / temp domains.
  if (!mailchecker.isValid(trimmed)) {
    return { valid: false, error: "Use a real email — disposable inboxes are blocked." };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Verify the domain has at least one mail server (MX or A record).
 * Returns false for fake-looking domains like `example.fakedomain123.com`.
 *
 * Server-side only — uses node:dns. Soft-fails (returns true) on transient
 * lookup errors so we don't reject legitimate users when DNS is flaky.
 */
export async function verifyMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  // "Definitive" codes mean the resolver answered and the name/record does not
  // exist. Anything else (timeout, SERVFAIL, EAI_AGAIN, no network) is a
  // resolver problem, not the user's, so we let them through.
  const DEFINITIVE = new Set(["ENOTFOUND", "ENODATA"]);
  let sawTransientError = false;

  const lookup = async <T,>(fn: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (!DEFINITIVE.has(code)) sawTransientError = true;
      return [];
    }
  };

  const mx = await lookup(() => dns.resolveMx(domain));
  if (mx.length > 0) return true;

  // Some domains accept mail on the A record per RFC 5321 §5.1.
  const a = await lookup(() => dns.resolve4(domain));
  if (a.length > 0) return true;

  const aaaa = await lookup(() => dns.resolve6(domain));
  if (aaaa.length > 0) return true;

  // Nothing found. Only reject if every lookup was a definitive "does not exist".
  return sawTransientError;
}

/** Combined check: format + disposable + MX. Server-side only. */
export async function validateEmail(raw: string): Promise<EmailValidation> {
  const format = validateEmailFormat(raw);
  if (!format.valid || !format.normalized) return format;
  const ok = await verifyMxRecord(format.normalized);
  if (!ok) {
    return { valid: false, error: "We can't reach mail servers for that domain." };
  }
  return format;
}
