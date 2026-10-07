/**
 * Unit tests for js/utils/csv.js (the CSV export).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { csvField, buildExpensesCsv } from "../js/utils/csv.js";

test("csvField quotes values and doubles inner quotes", () => {
  assert.equal(csvField("Lunch"), '"Lunch"');
  assert.equal(csvField('say "hi"'), '"say ""hi"""');
  assert.equal(csvField(null), '""');
});

test("csvField neutralises spreadsheet formulas", () => {
  // A note such as =HYPERLINK(...) must not run as a formula in Excel.
  assert.equal(csvField("=1+1"), "\"'=1+1\"");
  assert.equal(csvField("@SUM(A1)"), "\"'@SUM(A1)\"");
});

test("buildExpensesCsv writes a BOM, a header row and CRLF line endings", () => {
  const csv = buildExpensesCsv([
    { date: "2026-03-02", category: "Housing", amount: 480, note: "Rent, March" },
    { date: "2026-03-10", category: "Food", amount: "bad", note: "" },
  ]);

  assert.ok(csv.startsWith("﻿"), "starts with a UTF-8 byte-order mark");
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '"Date","Category","Amount (EUR)","Note"');
  assert.equal(lines[1], '"2026-03-02","Housing","480.00","Rent, March"');
  assert.equal(lines[2], '"2026-03-10","Food","0.00",""');
});
