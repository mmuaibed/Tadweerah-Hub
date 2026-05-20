/**
 * Canonical number/date formatting helpers.
 *
 * Forces Western Arabic (Latin) numerals everywhere by:
 * - Arabic locale → "ar-SA-u-nu-latn"  (thousands sep = ",", decimal sep = ".")
 * - English locale → "en-US"
 *
 * Use these helpers instead of raw .toLocaleString() to guarantee
 * Western digits regardless of OS/browser locale settings.
 */

const ARABIC_LATIN = "ar-SA-u-nu-latn";
const ENGLISH = "en-US";

function resolveLocale(lang: string): string {
  return lang === "ar" ? ARABIC_LATIN : ENGLISH;
}

/**
 * Format a plain number with Western digits.
 * Does not depend on lang — always produces Latin numerals.
 */
export function fmtNumber(
  val: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? NaN);
  if (!isFinite(n)) return "—";
  return n.toLocaleString(ENGLISH, opts);
}

/**
 * Format a SAR monetary value with 2 decimal places.
 * Respects lang for locale conventions (thousands separator) but
 * always uses Western/Latin digits.
 */
export function fmtSAR(
  val: number | string | null | undefined,
  lang: string,
): string {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? NaN);
  if (!isFinite(n)) return "—";
  return n.toLocaleString(resolveLocale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a date string (ISO or any parseable) as a short date.
 * Always uses Western digits.
 */
export function fmtDate(
  iso: string | null | undefined,
  lang: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(resolveLocale(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a datetime string (ISO or any parseable) as a short date + time.
 * Always uses Western digits.
 */
export function fmtDateTime(
  iso: string | null | undefined,
  lang: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(resolveLocale(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
