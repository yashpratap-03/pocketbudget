/**
 * PocketBudget – API test suite
 * ==============================
 * Course : DLBCSPJWD01
 * Author : Yash Pratap Singh
 *
 * Uses only Node's built-in test runner (node:test) and assert module, so the
 * project needs no extra dependencies.
 *
 * Run with:  npm test
 *
 * Every test runs against a throw-away data file in the OS temp directory,
 * so the real backend/data/expenses.json is never touched.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Point the server at a scratch data file before it is required.
const TEST_DATA_FILE = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "pocketbudget-test-")),
  "expenses.json",
);
process.env.DATA_FILE = TEST_DATA_FILE;

const { app } = require("../server");

// ── Test harness ─────────────────────────────────────────────────

let server;
let baseUrl;

/** Starts the app on an ephemeral port once for the whole suite. */
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => {
  server.close();
  fs.rmSync(path.dirname(TEST_DATA_FILE), { recursive: true, force: true });
});

/** Resets the store to a known state before each test. */
test.beforeEach(() => {
  fs.writeFileSync(TEST_DATA_FILE, "[]\n", "utf-8");
});

/**
 * Small request helper.
 * @param {string} method
 * @param {string} routePath
 * @param {unknown} [body]
 * @returns {Promise<{ status: number, body: any }>}
 */
async function request(method, routePath, body) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text === "" ? null : JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

/** Posts a valid expense, overriding any field. */
function validExpense(overrides = {}) {
  return {
    amount: 12.5,
    category: "Food",
    date: "2026-03-15",
    note: "Lunch",
    ...overrides,
  };
}

/** Reads the raw data file as JSON. */
function readStore() {
  return JSON.parse(fs.readFileSync(TEST_DATA_FILE, "utf-8"));
}

// ── Health & basics ──────────────────────────────────────────────

test("GET /health reports ok", async () => {
  const res = await request("GET", "/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("unknown routes return a JSON 404, not an HTML error page", async () => {
  const res = await request("GET", "/does-not-exist");
  assert.equal(res.status, 404);
  assert.equal(typeof res.body.error, "string");
});

test("GET /api/categories lists the allowed categories", async () => {
  const res = await request("GET", "/api/categories");
  assert.equal(res.status, 200);
  assert.ok(res.body.categories.includes("Food"));
  assert.equal(res.body.categories.length, 8);
});

// ── Creating expenses ────────────────────────────────────────────

test("POST /expenses stores a valid expense and returns it", async () => {
  const res = await request("POST", "/expenses", validExpense());

  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 12.5);
  assert.equal(res.body.category, "Food");
  assert.equal(res.body.date, "2026-03-15");
  assert.equal(res.body.note, "Lunch");
  assert.match(res.body.id, /^[0-9a-f-]{36}$/);
  assert.ok(res.body.createdAt);

  assert.equal(readStore().length, 1);
});

test("POST /expenses rounds an amount to two decimals", async () => {
  const res = await request("POST", "/expenses", validExpense({ amount: 9.999 }));
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 10);
});

test("POST /expenses accepts a numeric string amount", async () => {
  const res = await request("POST", "/expenses", validExpense({ amount: "42.75" }));
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 42.75);
});

test("POST /expenses normalises category casing", async () => {
  const res = await request("POST", "/expenses", validExpense({ category: "fOOd" }));
  assert.equal(res.status, 201);
  assert.equal(res.body.category, "Food");
});

test("POST /expenses treats a missing note as empty", async () => {
  const res = await request("POST", "/expenses", validExpense({ note: undefined }));
  assert.equal(res.status, 201);
  assert.equal(res.body.note, "");
});

// ── Rejecting bad input ──────────────────────────────────────────
// Each of these was accepted by the original implementation.

const invalidAmounts = [
  ["an empty string", ""],
  ["a negative number", -500],
  ["zero", 0],
  ["a non-numeric string", "abc"],
  ["a boolean", true],
  ["null", null],
  ["an array", []],
  ["an object", {}],
  ["Infinity (via 1e999)", 1e999],
  ["a value above the maximum", 5_000_000],
];

for (const [label, amount] of invalidAmounts) {
  test(`POST /expenses rejects ${label} as an amount`, async () => {
    const res = await request("POST", "/expenses", validExpense({ amount }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /amount/);
    assert.equal(readStore().length, 0, "nothing should be persisted");
  });
}

const invalidDates = [
  ["free text", "not-a-date"],
  ["the wrong separator", "2026/03/15"],
  ["a missing day", "2026-03"],
  ["an impossible day", "2026-02-31"],
  ["month 13", "2026-13-01"],
  ["an implausible year", "0001-01-01"],
  ["an empty string", ""],
  ["a number", 20260315],
];

for (const [label, date] of invalidDates) {
  test(`POST /expenses rejects ${label} as a date`, async () => {
    const res = await request("POST", "/expenses", validExpense({ date }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /date/);
    assert.equal(readStore().length, 0);
  });
}

test("POST /expenses rejects a category outside the allowed list", async () => {
  const res = await request(
    "POST",
    "/expenses",
    validExpense({ category: "<img src=x onerror=alert(1)>" }),
  );
  assert.equal(res.status, 400);
  assert.match(res.body.error, /category/);
  assert.equal(readStore().length, 0);
});

test("POST /expenses rejects a missing category", async () => {
  const res = await request("POST", "/expenses", validExpense({ category: "" }));
  assert.equal(res.status, 400);
  assert.match(res.body.error, /category/);
});

test("POST /expenses rejects an over-long note", async () => {
  const res = await request(
    "POST",
    "/expenses",
    validExpense({ note: "x".repeat(201) }),
  );
  assert.equal(res.status, 400);
  assert.match(res.body.error, /note/);
});

test("POST /expenses strips control characters from a note", async () => {
  const res = await request(
    "POST",
    "/expenses",
    validExpense({ note: "line one\nline two\ttabbed" }),
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.note, "line one line two tabbed");
});

test("POST /expenses rejects a non-object body", async () => {
  const res = await request("POST", "/expenses", ["not", "an", "object"]);
  assert.equal(res.status, 400);
});

test("POST /expenses rejects a malformed JSON body", async () => {
  const response = await fetch(`${baseUrl}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ this is not json",
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /JSON/);
});

// ── Reading and filtering ────────────────────────────────────────

test("GET /expenses returns totals and per-category breakdown", async () => {
  await request("POST", "/expenses", validExpense({ amount: 10, category: "Food" }));
  await request("POST", "/expenses", validExpense({ amount: 20, category: "Food" }));
  await request(
    "POST",
    "/expenses",
    validExpense({ amount: 5.5, category: "Transport" }),
  );

  const res = await request("GET", "/expenses");
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 3);
  assert.equal(res.body.totalAmount, 35.5);
  assert.deepEqual(res.body.totalsByCategory, { Food: 30, Transport: 5.5 });
});

test("GET /expenses filters by month", async () => {
  await request("POST", "/expenses", validExpense({ date: "2026-01-10" }));
  await request("POST", "/expenses", validExpense({ date: "2026-03-10" }));
  await request("POST", "/expenses", validExpense({ date: "2026-03-28" }));

  const res = await request("GET", "/expenses?month=2026-03");
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.ok(res.body.expenses.every((e) => e.date.startsWith("2026-03")));
});

test("GET /expenses filters by category, case-insensitively", async () => {
  await request("POST", "/expenses", validExpense({ category: "Food" }));
  await request("POST", "/expenses", validExpense({ category: "Housing" }));

  const res = await request("GET", "/expenses?category=housing");
  assert.equal(res.body.count, 1);
  assert.equal(res.body.expenses[0].category, "Housing");
});

test("GET /expenses rejects a malformed month filter", async () => {
  const res = await request("GET", "/expenses?month=March");
  assert.equal(res.status, 400);
  assert.match(res.body.error, /month/);
});

test("GET /expenses returns empty totals for an empty store", async () => {
  const res = await request("GET", "/expenses");
  assert.equal(res.body.count, 0);
  assert.equal(res.body.totalAmount, 0);
  assert.deepEqual(res.body.totalsByCategory, {});
});

// ── Deleting ─────────────────────────────────────────────────────

test("DELETE /expenses/:id removes the expense", async () => {
  const created = await request("POST", "/expenses", validExpense());
  const res = await request("DELETE", `/expenses/${created.body.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "deleted");
  assert.equal(readStore().length, 0);
});

test("DELETE /expenses/:id returns 404 for an unknown id", async () => {
  await request("POST", "/expenses", validExpense());
  const res = await request("DELETE", "/expenses/no-such-id");

  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/i);
  assert.equal(readStore().length, 1, "existing data must be untouched");
});

// ── Data-file resilience ─────────────────────────────────────────
// The original code returned [] for any read failure, so the next write
// silently overwrote every stored expense. These tests lock that shut.

test("a corrupt data file is reported, not silently emptied", async () => {
  fs.writeFileSync(TEST_DATA_FILE, '[{"id":"x","amount":15,', "utf-8");

  const res = await request("GET", "/expenses");
  assert.equal(res.status, 500);
  assert.match(res.body.error, /invalid JSON/);
});

test("a corrupt data file is never overwritten by a new POST", async () => {
  const corrupt = '[{"id":"x","amount":15,';
  fs.writeFileSync(TEST_DATA_FILE, corrupt, "utf-8");

  const res = await request("POST", "/expenses", validExpense());
  assert.equal(res.status, 500);
  assert.equal(
    fs.readFileSync(TEST_DATA_FILE, "utf-8"),
    corrupt,
    "the original file contents must survive",
  );
});

test("a data file holding a JSON object is reported as invalid", async () => {
  fs.writeFileSync(TEST_DATA_FILE, "{}", "utf-8");

  const res = await request("GET", "/expenses");
  assert.equal(res.status, 500);
  assert.match(res.body.error, /must contain a JSON array/);
});

test("an empty data file reads as no expenses", async () => {
  fs.writeFileSync(TEST_DATA_FILE, "", "utf-8");

  const res = await request("GET", "/expenses");
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
});

test("a missing data file is recreated on write", async () => {
  fs.rmSync(TEST_DATA_FILE, { force: true });

  const res = await request("POST", "/expenses", validExpense());
  assert.equal(res.status, 201);
  assert.equal(readStore().length, 1);
});

test("a missing data directory is recreated on write", async () => {
  fs.rmSync(path.dirname(TEST_DATA_FILE), { recursive: true, force: true });

  const res = await request("POST", "/expenses", validExpense());
  assert.equal(res.status, 201);
  assert.equal(readStore().length, 1);
});

test("hand-edited records with bad values do not crash totals", async () => {
  fs.writeFileSync(
    TEST_DATA_FILE,
    JSON.stringify([
      { id: "a", amount: "not a number", category: "Food", date: "2026-03-01" },
      { id: "b", amount: 10, category: "Food" }, // no date at all
      { id: "c", amount: 5, date: "2026-03-02" }, // no category
      null, // not even an object
    ]),
    "utf-8",
  );

  const res = await request("GET", "/expenses?month=2026-03");
  assert.equal(res.status, 200);
  assert.equal(res.body.totalAmount, 5);

  const all = await request("GET", "/expenses");
  assert.equal(all.status, 200);
  assert.equal(all.body.totalAmount, 15);
  assert.equal(all.body.count, 3, "the null entry is skipped");
});

test("no temporary files are left behind after writes", async () => {
  await request("POST", "/expenses", validExpense());

  const leftovers = fs
    .readdirSync(path.dirname(TEST_DATA_FILE))
    .filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
});
