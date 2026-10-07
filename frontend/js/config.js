/**
 * Frontend configuration: every constant the UI depends on, in one place.
 * Nothing in this file touches the DOM.
 */

/**
 * Base URL of the API. Empty string means "same origin": the Express server
 * serves both this page and the API from http://localhost:3001.
 */
export const API_BASE_URL = "";

/** Abort a request that hangs, so the UI never stays on "Loading…". */
export const REQUEST_TIMEOUT_MS = 8000;

/** Input limits. Must match LIMITS in backend/src/config/index.js. */
export const MAX_NOTE_LENGTH = 200;
export const MAX_AMOUNT = 1000000;

/** localStorage key under which the monthly budget is saved. */
export const BUDGET_STORAGE_KEY = "pb_budget";

/** Badge and chart colours per category. */
export const CATEGORY_STYLES = Object.freeze({
  Food: { color: "#f97316", bg: "#fff7ed" },
  Transport: { color: "#0ea5e9", bg: "#f0f9ff" },
  Housing: { color: "#7c3aed", bg: "#f5f3ff" },
  Entertainment: { color: "#ec4899", bg: "#fdf2f8" },
  Health: { color: "#16a34a", bg: "#f0fdf4" },
  Shopping: { color: "#d97706", bg: "#fffbeb" },
  Education: { color: "#06b6d4", bg: "#ecfeff" },
  Other: { color: "#6b7280", bg: "#f9fafb" },
});

/** Used for any category not listed above. */
export const DEFAULT_CATEGORY_STYLE = Object.freeze({ color: "#22813e", bg: "#edfaf2" });
