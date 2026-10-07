/**
 * Unit tests for js/utils/validation.js (client-side form checks).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { validateExpenseForm, validateBudget } from "../js/utils/validation.js";
import { MAX_AMOUNT, MAX_NOTE_LENGTH } from "../js/config.js";

/** A valid form, which individual tests modify one field at a time. */
const validForm = () => ({ amount: "24.50", category: "Food", date: "2026-03-20", note: " Team lunch " });

test("a valid form produces a clean payload", () => {
  assert.deepEqual(validateExpenseForm(validForm()), {
    ok: true,
    payload: { amount: 24.5, category: "Food", date: "2026-03-20", note: "Team lunch" },
  });
});

test("amount must be a positive number within the limit", () => {
  for (const amount of ["", "abc", "0", "-5", String(MAX_AMOUNT + 1)]) {
    const result = validateExpenseForm({ ...validForm(), amount });
    assert.equal(result.ok, false, `amount "${amount}" should fail`);
  }
});

test("category and date are required", () => {
  assert.equal(validateExpenseForm({ ...validForm(), category: "" }).ok, false);
  assert.equal(validateExpenseForm({ ...validForm(), date: "" }).ok, false);
  assert.equal(validateExpenseForm({ ...validForm(), date: "20/03/2026" }).ok, false);
});

test("a note longer than the limit is rejected", () => {
  const note = "x".repeat(MAX_NOTE_LENGTH + 1);
  assert.equal(validateExpenseForm({ ...validForm(), note }).ok, false);
});

test("validateBudget accepts a positive amount and rounds it", () => {
  assert.deepEqual(validateBudget("999.999"), { ok: true, value: 1000 });
});

test("validateBudget rejects empty, zero, negative and oversized values", () => {
  for (const raw of ["", "0", "-1", "abc", String(MAX_AMOUNT + 1)]) {
    assert.equal(validateBudget(raw).ok, false, `budget "${raw}" should fail`);
  }
});
