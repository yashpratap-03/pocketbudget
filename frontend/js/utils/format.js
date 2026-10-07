/**
 * Pure formatting helpers. No DOM access, so they can be unit-tested in Node.
 */

import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "../config.js";

/**
 * Formats a number as euros, tolerating non-numeric input from the store.
 * @param {unknown} value
 * @returns {string} e.g. "€15.50"
 */
export function formatEuro(value) {
  const num = Number(value);
  return `€${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

/**
 * Formats a YYYY-MM-DD string for display. The parts are parsed manually to
 * avoid time-zone shifts; anything that is not a valid date is returned as-is.
 * @param {unknown} dateStr
 * @returns {string} e.g. "15 Mar 2026"
 */
export function formatDate(dateStr) {
  if (typeof dateStr !== "string") return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return dateStr || "—";

  const [y, m, d] = match.slice(1).map(Number);
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns a date as YYYY-MM-DD in the user's local time zone. Used to pre-fill
 * the date input; `input.valueAsDate = new Date()` would use UTC and show
 * yesterday's date shortly after midnight in Germany.
 * @param {Date} [date]
 * @returns {string}
 */
export function toLocalIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Colour configuration for a category, with a fallback for unknown ones.
 * @param {string} category
 * @returns {{ color: string, bg: string }}
 */
export function getCategoryStyle(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, category)
    ? CATEGORY_STYLES[category]
    : DEFAULT_CATEGORY_STYLE;
}

/**
 * Returns [category, amount] pairs sorted by amount, highest first, skipping
 * anything that is not a finite number.
 * @param {Record<string, unknown>} totals
 * @returns {Array<[string, number]>}
 */
export function sortCategoryTotals(totals) {
  return Object.entries(totals || {})
    .map(([cat, amt]) => [cat, Number(amt)])
    .filter(([, amt]) => Number.isFinite(amt))
    .sort(([, a], [, b]) => b - a);
}
