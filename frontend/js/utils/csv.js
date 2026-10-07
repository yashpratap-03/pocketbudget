/**
 * Builds the CSV export text. Pure functions, no DOM.
 */

/**
 * Escapes one CSV field: doubles quotes and prefixes a leading =, +, - or @
 * with an apostrophe so spreadsheet software treats it as text, not a formula.
 * @param {unknown} value
 * @returns {string}
 */
export function csvField(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Converts expenses into CSV text with a header row. CRLF line endings and a
 * UTF-8 byte-order mark make Excel read the € values correctly.
 * @param {Array<Object>} expenses
 * @returns {string}
 */
export function buildExpensesCsv(expenses) {
  const headers = ["Date", "Category", "Amount (EUR)", "Note"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    (Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0).toFixed(2),
    e.note || "",
  ]);
  return "﻿" + [headers, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
}
