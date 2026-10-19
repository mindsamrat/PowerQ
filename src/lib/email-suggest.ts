/**
 * "Did you mean name@gmail.com?" — a gentle hint for a mistyped email
 * domain. Pure, client-safe, never blocks: the server still validates.
 */

const POPULAR_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "aol.com",
  "proton.me", "protonmail.com", "yahoo.co.uk", "yahoo.co.in", "hotmail.co.uk", "rediffmail.com",
  "me.com", "msn.com", "zoho.com", "ymail.com", "mail.com", "gmx.com", "fastmail.com",
];

/** Common misspellings that edit distance alone would miss or misroute. */
const KNOWN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmali.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com",
  "gmaill.com": "gmail.com", "gmai.com": "gmail.com", "gmail.comm": "gmail.com", "gmail.co.in": "gmail.com",
  "googlemail.co": "googlemail.com", "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.con": "hotmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
  "icloud.co": "icloud.com", "iclould.com": "icloud.com", "icoud.com": "icloud.com", "icloud.con": "icloud.com",
  "protonmail.co": "protonmail.com", "proton.com": "proton.me",
};

const TLD_TYPOS: Record<string, string> = { con: "com", cm: "com", om: "com", comm: "com", vom: "com", xom: "com", cpm: "com" };

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = temp;
    }
  }
  return prev[b.length];
}

/** The corrected address, or null when the domain looks fine (or unknown). */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1 || email.length > 254) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (POPULAR_DOMAINS.includes(domain)) return null;

  let fixed: string | null = KNOWN_TYPOS[domain] ?? null;

  if (!fixed) {
    const dot = domain.lastIndexOf(".");
    const tld = dot >= 0 ? domain.slice(dot + 1) : "";
    if (TLD_TYPOS[tld]) fixed = `${domain.slice(0, dot)}.${TLD_TYPOS[tld]}`;
  }

  if (!fixed) {
    // Only nudge when the typo is one or two keystrokes from a popular
    // domain; anything further is more likely a real, smaller provider.
    let best: { domain: string; distance: number } | null = null;
    for (const candidate of POPULAR_DOMAINS) {
      const distance = levenshtein(domain, candidate);
      if (distance <= 2 && (!best || distance < best.distance)) best = { domain: candidate, distance };
    }
    if (best) fixed = best.domain;
  }

  if (!fixed || fixed === domain) return null;
  return `${local}@${fixed}`;
}
