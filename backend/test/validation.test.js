/**
 * Unit tests for src/validation/expenseValidation.js.
 *
 * These call the validators directly, without starting a server, which is
 * possible because validation is now its own pure module.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAmount,
  validateCategory,
  validateDate,
  validateNote,
  validateExpenseInput,
  validateMonthFilter,
} = require("../src/validation/expenseValidation");

test("validateAmount rounds a valid amount to two decimals", () => {
  assert.deepEqual(validateAmount(9.999), { ok: true, value: 10 });
  assert.deepEqual(validateAmount("12.345"), { ok: true, value: 12.35 });
});

test("validateAmount rejects zero, negatives and non-numbers", () => {
  for (const bad of [0, -1, "abc", "", true, null, [], {}, Infinity]) {
    assert.equal(validateAmount(bad).ok, false, `expected ${String(bad)} to fail`);
  }
});

test("validateCategory returns the canonical casing", () => {
  assert.deepEqual(validateCategory("  housing "), { ok: true, value: "Housing" });
});

test("validateCategory rejects unknown categories", () => {
  const result = validateCategory("Holidays");
  assert.equal(result.ok, false);
  assert.match(result.error, /must be one of/);
});

test("validateDate accepts a real date and rejects an impossible one", () => {
  assert.deepEqual(validateDate("2024-02-29"), { ok: true, value: "2024-02-29" });
  assert.equal(validateDate("2026-02-29").ok, false, "2026 is not a leap year");
  assert.equal(validateDate("2026-04-31").ok, false);
});

test("validateNote collapses whitespace and control characters", () => {
  assert.deepEqual(validateNote("  a\t\tb\nc  "), { ok: true, value: "a b c" });
  assert.deepEqual(validateNote(undefined), { ok: true, value: "" });
  assert.equal(validateNote(42).ok, false);
});

test("validateExpenseInput returns cleaned fields for a valid body", () => {
  const result = validateExpenseInput({
    amount: "7.5",
    category: "food",
    date: "2026-03-01",
    note: " Coffee ",
  });
  assert.deepEqual(result, {
    ok: true,
    value: { amount: 7.5, category: "Food", date: "2026-03-01", note: "Coffee" },
  });
});

test("validateExpenseInput reports the first invalid field", () => {
  const result = validateExpenseInput({ amount: -1, category: "Nope", date: "x" });
  assert.equal(result.ok, false);
  assert.match(result.error, /amount/);
});

test("validateMonthFilter accepts YYYY-MM and treats absence as no filter", () => {
  assert.deepEqual(validateMonthFilter("2026-03"), { ok: true, value: "2026-03" });
  assert.deepEqual(validateMonthFilter(undefined), { ok: true, value: null });
  assert.equal(validateMonthFilter("2026-13").ok, false);
});
