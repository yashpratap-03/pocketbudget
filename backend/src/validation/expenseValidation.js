/**
 * Validation rules for incoming expense data.
 *
 * Pure functions only: no Express, no file system. Each validator returns
 * either { ok: true, value } with the cleaned value, or { ok: false, error }.
 * Keeping them pure means they can be unit-tested directly.
 */

"use strict";

const { ALLOWED_CATEGORIES, LIMITS } = require("../config");
const { roundMoney } = require("../utils/money");

const ok = (value) => ({ ok: true, value });
const fail = (error) => ({ ok: false, error });

/**
 * Amount must be a finite number (or numeric string), greater than zero and
 * at most LIMITS.MAX_AMOUNT. Booleans, arrays, "", NaN and Infinity fail.
 */
function validateAmount(amount) {
  if (typeof amount !== "number" && typeof amount !== "string") {
    return fail("amount must be a number");
  }
  if (typeof amount === "string" && amount.trim() === "") {
    return fail("amount is required");
  }

  const value = Number(amount);
  if (!Number.isFinite(value)) return fail("amount must be a finite number");
  if (value <= 0) return fail("amount must be greater than 0");
  if (value > LIMITS.MAX_AMOUNT) {
    return fail(`amount must not exceed ${LIMITS.MAX_AMOUNT}`);
  }
  return ok(roundMoney(value));
}

/**
 * Category must match ALLOWED_CATEGORIES case-insensitively. The canonical
 * casing is returned ("fOOd" becomes "Food").
 */
function validateCategory(category) {
  if (typeof category !== "string" || category.trim() === "") {
    return fail("category is required");
  }
  const wanted = category.trim().toLowerCase();
  const match = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === wanted);
  if (!match) {
    return fail(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }
  return ok(match);
}

/**
 * Date must be YYYY-MM-DD, a real calendar day (2026-02-31 fails) and within
 * a plausible year range.
 */
function validateDate(date) {
  if (typeof date !== "string" || date.trim() === "") {
    return fail("date is required (YYYY-MM-DD)");
  }

  const value = date.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return fail("date must be in YYYY-MM-DD format");

  const [year, month, day] = match.slice(1).map(Number);
  if (year < LIMITS.MIN_YEAR || year > LIMITS.MAX_YEAR) {
    return fail(`date year must be between ${LIMITS.MIN_YEAR} and ${LIMITS.MAX_YEAR}`);
  }

  // Round-trip through Date to reject impossible days.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isRealDate) return fail("date is not a real calendar date");

  return ok(value);
}

/**
 * The note is optional. It is trimmed, control characters become spaces (so
 * a note stays on one line and cannot break the CSV export) and its length is
 * capped.
 */
function validateNote(note) {
  if (note === undefined || note === null || note === "") return ok("");
  if (typeof note !== "string") return fail("note must be text");

  const cleaned = note
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length > LIMITS.MAX_NOTE_LENGTH) {
    return fail(`note must be ${LIMITS.MAX_NOTE_LENGTH} characters or fewer`);
  }
  return ok(cleaned);
}

/**
 * Validates a whole POST body and returns the cleaned fields, stopping at the
 * first error so the client gets one clear message.
 * @returns {{ ok: true, value: {amount:number, category:string, date:string, note:string} }
 *         | { ok: false, error: string }}
 */
function validateExpenseInput(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }

  const amount = validateAmount(body.amount);
  if (!amount.ok) return amount;
  const category = validateCategory(body.category);
  if (!category.ok) return category;
  const date = validateDate(body.date);
  if (!date.ok) return date;
  const note = validateNote(body.note);
  if (!note.ok) return note;

  return ok({
    amount: amount.value,
    category: category.value,
    date: date.value,
    note: note.value,
  });
}

/** Optional ?month=YYYY-MM filter. Returns value null when absent. */
function validateMonthFilter(month) {
  if (month === undefined) return ok(null);
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return fail("month filter must be in YYYY-MM format");
  }
  const monthNumber = Number(month.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) {
    return fail("month filter must have a month of 01-12");
  }
  return ok(month);
}

module.exports = {
  validateAmount,
  validateCategory,
  validateDate,
  validateNote,
  validateExpenseInput,
  validateMonthFilter,
};
