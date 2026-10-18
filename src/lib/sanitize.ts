/**
 * Pure string sanitisers shared by the server (trust boundary) and the quiz
 * page (so the client rejects exactly what the server would reject, before
 * the user is sent an error after 27 questions). No Node or Next imports.
 */

/** Remove lone UTF-16 surrogates (half an emoji) which break JSON storage and PDF rendering. */
export function stripLoneSurrogates(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Truncate to `max` code points (never splits a surrogate pair). */
export function truncateCodePoints(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, max).join("");
}

export const NAME_MAX = 60;
export const FREE_TEXT_MAX = 280;

/**
 * First name. The raw value is cut short BEFORE any regex runs, and every
 * pattern is linear-time, so a hostile payload cannot pin the function.
 * Emails and URLs are removed; a stray "@" is dropped rather than wiping the
 * whole word ("@rahul" -> "rahul").
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const v = stripLoneSurrogates(raw.slice(0, 200))
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\S+@\S+\.\S+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[<>@]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return truncateCodePoints(v, NAME_MAX).trim();
}

/**
 * Free-text answers are only ever rendered inside the respondent's own PDF
 * (react-pdf escapes everything), so nothing is stripped beyond control
 * characters and broken surrogates. Line breaks become spaces.
 */
export function sanitizeFreeText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const v = stripLoneSurrogates(raw.slice(0, 2000))
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncateCodePoints(v, FREE_TEXT_MAX).trim();
}

/** "an Architect", "a Sovereign" — for archetype names that start with "The ". */
export function withArticle(archetypeName: string): string {
  const bare = archetypeName.replace(/^The /, "");
  return `${/^[AEIOU]/i.test(bare) ? "an" : "a"} ${bare}`;
}

/** "the Architects" — plural for archetype names. */
export function pluralName(archetypeName: string): string {
  return `the ${archetypeName.replace(/^The /, "")}s`;
}
