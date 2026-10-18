/**
 * Page counts quoted in marketing copy. scripts/pdf-smoke.ts fails if a
 * rendered report disagrees with PAID_REPORT_PAGES, so the number on the
 * results page can never drift from the document people actually receive.
 */
export const PAID_REPORT_PAGES = 26;
export const FREE_REPORT_PAGES = 4;
/** Display price of the paid report. The real price is set on the Dodo product; keep these in sync. */
export const REPORT_PRICE_LABEL = "$3";
