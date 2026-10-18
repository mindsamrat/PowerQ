import mailchecker from "mailchecker";
import { promises as dns } from "node:dns";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidation {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Large, well-known mailbox providers. Accepted without a DNS lookup: they
 * cover the overwhelming majority of real sign-ups, and skipping DNS for them
 * means a resolver outage can never block most respondents.
 */
const KNOWN_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.in", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "pm.me",
  "zoho.com", "zohomail.in", "gmx.com", "gmx.net", "gmx.de", "web.de", "mail.com",
  "yandex.com", "yandex.ru", "fastmail.com", "hey.com", "tutanota.com", "tuta.io",
  "rediffmail.com", "qq.com", "163.com", "naver.com", "comcast.net", "verizon.net",
  "att.net", "sbcglobal.net", "bellsouth.net", "cox.net", "charter.net",
]);

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

const LOOKUP_TIMEOUT_MS = 2500;
/** Codes meaning "the resolver answered: this name/record does not exist". */
const DEFINITIVE = new Set(["ENOTFOUND", "ENODATA"]);

type LookupResult = { found: boolean; definitiveMiss: boolean };

async function lookup<T>(fn: () => Promise<T[]>): Promise<LookupResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("dns timeout"), { code: "ETIMEOUT" })), LOOKUP_TIMEOUT_MS);
    });
    const records = await Promise.race([fn(), timeout]);
    return { found: records.length > 0, definitiveMiss: records.length === 0 };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    return { found: false, definitiveMiss: DEFINITIVE.has(code) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Does the domain accept mail? MX, or A/AAAA per RFC 5321 §5.1. Lookups run in parallel. */
async function domainResolves(domain: string): Promise<LookupResult> {
  const [mx, a, aaaa] = await Promise.all([
    lookup(() => dns.resolveMx(domain)),
    lookup(() => dns.resolve4(domain)),
    lookup(() => dns.resolve6(domain)),
  ]);
  if (mx.found || a.found || aaaa.found) return { found: true, definitiveMiss: false };
  return { found: false, definitiveMiss: mx.definitiveMiss && a.definitiveMiss && aaaa.definitiveMiss };
}

/**
 * Verify the domain has a mail server. Rejects only when we are confident the
 * domain is fake: every lookup said "does not exist" AND the resolver is
 * demonstrably working (a known-good canary domain resolves). A broken or
 * offline resolver answers "does not exist" for everything; in that case we
 * let the user through rather than block every sign-up.
 */
export async function verifyMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  if (KNOWN_PROVIDERS.has(domain)) return true;

  const result = await domainResolves(domain);
  if (result.found) return true;
  if (!result.definitiveMiss) return true; // timeouts / SERVFAIL: resolver trouble, not the user's

  const canary = await domainResolves("gmail.com");
  if (!canary.found) {
    console.warn("[email-validation] resolver cannot resolve gmail.com; skipping MX check for", domain);
    return true;
  }
  return false;
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
