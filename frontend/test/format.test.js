/**
 * Unit tests for js/utils/format.js.
 *
 * format.js has no DOM access, so Node can import it directly. This is one
 * benefit of splitting the old app.js: pure helpers can be tested without a
 * browser.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatEuro,
  formatDate,
  toLocalIsoDate,
  getCategoryStyle,
  sortCategoryTotals,
} from "../js/utils/format.js";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "../js/config.js";

test("formatEuro prints two decimals with a euro sign", () => {
  assert.equal(formatEuro(15.5), "€15.50");
  assert.equal(formatEuro("7"), "€7.00");
});

test("formatEuro treats unusable values as zero", () => {
  for (const bad of [undefined, null, "abc", NaN, Infinity]) {
    assert.equal(formatEuro(bad), "€0.00");
  }
});

test("formatDate shows the year of a valid YYYY-MM-DD date", () => {
  // The exact text depends on the machine's locale, so only stable parts are checked.
  const text = formatDate("2026-03-15");
  assert.match(text, /2026/);
  assert.match(text, /15/);
});

test("formatDate returns a dash for missing dates and leaves junk unchanged", () => {
  assert.equal(formatDate(undefined), "—");
  assert.equal(formatDate(""), "—");
  assert.equal(formatDate("not-a-date"), "not-a-date");
});

test("toLocalIsoDate uses local calendar fields, padded to two digits", () => {
  assert.equal(toLocalIsoDate(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(toLocalIsoDate(new Date(2026, 9, 8, 0, 30)), "2026-10-08");
});

test("getCategoryStyle returns the configured colours or the fallback", () => {
  assert.deepEqual(getCategoryStyle("Food"), CATEGORY_STYLES.Food);
  assert.deepEqual(getCategoryStyle("Unknown"), DEFAULT_CATEGORY_STYLE);
  // Inherited object keys must not count as categories.
  assert.deepEqual(getCategoryStyle("toString"), DEFAULT_CATEGORY_STYLE);
});

test("sortCategoryTotals sorts by amount and drops non-numbers", () => {
  const sorted = sortCategoryTotals({ Food: 20, Housing: 480, Bad: "x", Fun: "100" });
  assert.deepEqual(sorted, [
    ["Housing", 480],
    ["Fun", 100],
    ["Food", 20],
  ]);
  assert.deepEqual(sortCategoryTotals(null), []);
});
