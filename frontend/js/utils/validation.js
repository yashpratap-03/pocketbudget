/**
 * Client-side validation of the add-expense form. It mirrors the server rules
 * so the user gets the same answer before a request is even sent. The server
 * still validates everything; this only gives faster feedback.
 */

import { MAX_AMOUNT, MAX_NOTE_LENGTH } from "../config.js";

/**
 * @param {{ amount: string, category: string, date: string, note: string }} values
 *   raw values read from the form inputs
 * @returns {{ ok: true, payload: Object } | { ok: false, error: string }}
 */
export function validateExpenseForm(values) {
  const amount = Number.parseFloat(values.amount);
  if (!Number.isFinite(amount)) return { ok: false, error: "Please enter an amount." };
  if (amount <= 0) return { ok: false, error: "Amount must be greater than 0." };
  if (amount > MAX_AMOUNT) {
    return { ok: false, error: `Amount must not exceed €${MAX_AMOUNT.toLocaleString()}.` };
  }

  const category = values.category;
  if (!category) return { ok: false, error: "Please choose a category." };

  const date = values.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Please pick a valid date." };
  }

  const note = (values.note || "").trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
  }

  return { ok: true, payload: { amount, category, date, note } };
}

/**
 * Validates a monthly budget entered by the user.
 * @param {string} raw
 * @returns {{ ok: true, value: number } | { ok: false, error: string }}
 */
export function validateBudget(raw) {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Enter a valid budget amount." };
  }
  if (value > MAX_AMOUNT) {
    return { ok: false, error: `Budget must not exceed €${MAX_AMOUNT.toLocaleString()}.` };
  }
  return { ok: true, value: Math.round(value * 100) / 100 };
}
