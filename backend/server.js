/**
 * PocketBudget – Express REST API
 * ================================
 * Course : DLBCSPJWD01
 * Author : Yash Pratap Singh
 *
 * Responsibilities:
 *  - Serve the static frontend (frontend/)
 *  - Expose a small JSON REST API over a file-backed expense store
 *  - Validate every incoming field strictly before persisting
 *  - Never lose or silently discard data on disk
 */

"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Configuration ────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

// DATA_FILE is overridable so the test suite can run against a scratch file
// instead of the real store.
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, "data", "expenses.json");

/** Categories the UI offers. Anything else is rejected. */
const ALLOWED_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Other",
];

/** Guard rails on user input. */
const MAX_AMOUNT = 1_000_000; // a single expense above this is a typo
const MAX_NOTE_LENGTH = 200;
const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

// ── App setup ────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(FRONTEND_DIR));

// ── Storage layer ────────────────────────────────────────────────

/**
 * Error type for an unreadable/corrupt data file. Raised instead of
 * quietly returning an empty list, because returning [] would let the
 * next write overwrite the file and destroy every existing expense.
 */
class DataFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataFileError";
    this.statusCode = 500;
  }
}

/** Creates the data directory and an empty store if they do not exist. */
function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]\n", "utf-8");
  }
}

/**
 * Reads every expense from disk.
 * @returns {Array<Object>} the stored expenses (empty only if the file is
 *   genuinely absent)
 * @throws {DataFileError} if the file exists but cannot be parsed, or does
 *   not contain a JSON array — never silently discards data
 */
function readExpenses() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_FILE, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw new DataFileError(`Cannot read the data file: ${err.message}`);
  }

  if (raw.trim() === "") return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DataFileError(
      `The data file ${path.basename(DATA_FILE)} contains invalid JSON ` +
        `(${err.message}). It was left untouched — please repair or restore it.`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new DataFileError(
      `The data file ${path.basename(DATA_FILE)} must contain a JSON array. ` +
        `It was left untouched — please repair or restore it.`,
    );
  }

  return parsed.filter((entry) => entry !== null && typeof entry === "object");
}

/**
 * Persists expenses atomically: writes a temporary file in the same
 * directory, then renames it over the target. A crash mid-write therefore
 * leaves the previous version intact rather than a truncated file.
 * @param {Array<Object>} expenses
 */
function writeExpenses(expenses) {
  ensureDataFile();
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    // Clean up the partial temp file so it cannot accumulate.
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* nothing more we can do */
    }
    throw new DataFileError(`Could not save the data file: ${err.message}`);
  }
}

// ── Value helpers ────────────────────────────────────────────────
// Stored records are treated as untrusted: a hand-edited file must never
// crash a request or poison a total.

/** @returns {number} a finite amount, or 0 for anything unusable */
function safeAmount(entry) {
  const value = Number(entry.amount);
  return Number.isFinite(value) ? value : 0;
}

/** @returns {string} the date string, or "" if absent/not a string */
function safeDate(entry) {
  return typeof entry.date === "string" ? entry.date : "";
}

/** @returns {string} the category, or "Other" if absent/not a string */
function safeCategory(entry) {
  return typeof entry.category === "string" && entry.category.trim() !== ""
    ? entry.category
    : "Other";
}

/** Rounds to 2 decimals without float drift (e.g. 1.005 → 1.01). */
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ── Validation ───────────────────────────────────────────────────

/**
 * Validates an amount: must be a finite number (or numeric string) greater
 * than zero and at most MAX_AMOUNT. Rejects "", booleans, arrays, NaN and
 * Infinity, all of which the previous `isNaN(Number(x))` check let through.
 * @returns {{ ok: true, value: number } | { ok: false, error: string }}
 */
function validateAmount(amount) {
  if (typeof amount !== "number" && typeof amount !== "string") {
    return { ok: false, error: "amount must be a number" };
  }
  if (typeof amount === "string" && amount.trim() === "") {
    return { ok: false, error: "amount is required" };
  }

  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "amount must be a finite number" };
  }
  if (value <= 0) {
    return { ok: false, error: "amount must be greater than 0" };
  }
  if (value > MAX_AMOUNT) {
    return { ok: false, error: `amount must not exceed ${MAX_AMOUNT}` };
  }
  return { ok: true, value: roundMoney(value) };
}

/**
 * Validates a category against ALLOWED_CATEGORIES (case-insensitively) and
 * returns it in canonical casing.
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
function validateCategory(category) {
  if (typeof category !== "string" || category.trim() === "") {
    return { ok: false, error: "category is required" };
  }
  const match = ALLOWED_CATEGORIES.find(
    (allowed) => allowed.toLowerCase() === category.trim().toLowerCase(),
  );
  if (!match) {
    return {
      ok: false,
      error: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
    };
  }
  return { ok: true, value: match };
}

/**
 * Validates a YYYY-MM-DD date. Checks the shape, that it is a real calendar
 * date (rejects 2026-02-31), and that the year is plausible.
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
function validateDate(date) {
  if (typeof date !== "string" || date.trim() === "") {
    return { ok: false, error: "date is required (YYYY-MM-DD)" };
  }

  const value = date.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return { ok: false, error: "date must be in YYYY-MM-DD format" };
  }

  const [year, month, day] = match.slice(1).map(Number);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return {
      ok: false,
      error: `date year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
    };
  }

  // Round-trip through Date to reject impossible days (e.g. 31 February).
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isRealDate) {
    return { ok: false, error: "date is not a real calendar date" };
  }

  return { ok: true, value };
}

/**
 * Normalises an optional note: trims it, strips control characters and
 * enforces a length cap.
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
function validateNote(note) {
  if (note === undefined || note === null || note === "") {
    return { ok: true, value: "" };
  }
  if (typeof note !== "string") {
    return { ok: false, error: "note must be text" };
  }

  // Strip control characters (newlines, NUL, DEL) and collapse whitespace so
  // a note stays on one line and cannot break the CSV export.
  const cleaned = note
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `note must be ${MAX_NOTE_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, value: cleaned };
}

/** Validates an optional ?month=YYYY-MM filter. */
function validateMonthFilter(month) {
  if (month === undefined) return { ok: true, value: null };
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, error: "month filter must be in YYYY-MM format" };
  }
  const monthNumber = Number(month.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) {
    return { ok: false, error: "month filter must have a month of 01–12" };
  }
  return { ok: true, value: month };
}

// ── Routes ───────────────────────────────────────────────────────

/** GET / — serve the single-page frontend. */
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

/** GET /health — liveness probe. */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "PocketBudget backend is running" });
});

/** GET /api/categories — the category list, so the UI cannot drift from it. */
app.get("/api/categories", (req, res) => {
  res.json({ categories: ALLOWED_CATEGORIES });
});

/**
 * POST /expenses
 * Body: { amount, category, date, note? }
 * Returns 201 with the created expense, or 400 with { error } on bad input.
 */
app.post("/expenses", (req, res) => {
  const body = req.body;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  const amount = validateAmount(body.amount);
  if (!amount.ok) return res.status(400).json({ error: amount.error });

  const category = validateCategory(body.category);
  if (!category.ok) return res.status(400).json({ error: category.error });

  const date = validateDate(body.date);
  if (!date.ok) return res.status(400).json({ error: date.error });

  const note = validateNote(body.note);
  if (!note.ok) return res.status(400).json({ error: note.error });

  const newExpense = {
    id: crypto.randomUUID(),
    amount: amount.value,
    category: category.value,
    date: date.value, // kept as a YYYY-MM-DD string
    note: note.value,
    createdAt: new Date().toISOString(),
  };

  const expenses = readExpenses();
  expenses.push(newExpense);
  writeExpenses(expenses);

  res.status(201).json(newExpense);
});

/**
 * GET /expenses
 * Optional query params: month=YYYY-MM, category=<name>
 * Returns { count, totalAmount, totalsByCategory, expenses }.
 */
app.get("/expenses", (req, res) => {
  // Express collects repeated params into arrays; only accept single values.
  const rawMonth = Array.isArray(req.query.month)
    ? req.query.month[0]
    : req.query.month;
  const rawCategory = Array.isArray(req.query.category)
    ? req.query.category[0]
    : req.query.category;

  const month = validateMonthFilter(rawMonth);
  if (!month.ok) return res.status(400).json({ error: month.error });

  let expenses = readExpenses();

  if (month.value) {
    expenses = expenses.filter((e) => safeDate(e).startsWith(month.value));
  }
  if (rawCategory !== undefined && rawCategory !== "") {
    const wanted = String(rawCategory).trim().toLowerCase();
    expenses = expenses.filter(
      (e) => safeCategory(e).toLowerCase() === wanted,
    );
  }

  const totalAmount = roundMoney(
    expenses.reduce((sum, e) => sum + safeAmount(e), 0),
  );

  const totalsByCategory = {};
  for (const e of expenses) {
    const category = safeCategory(e);
    totalsByCategory[category] =
      (totalsByCategory[category] || 0) + safeAmount(e);
  }
  for (const category of Object.keys(totalsByCategory)) {
    totalsByCategory[category] = roundMoney(totalsByCategory[category]);
  }

  res.json({
    count: expenses.length,
    totalAmount,
    totalsByCategory,
    expenses,
  });
});

/** DELETE /expenses/:id — remove one expense by its UUID. */
app.delete("/expenses/:id", (req, res) => {
  const { id } = req.params;
  const expenses = readExpenses();
  const remaining = expenses.filter((e) => e.id !== id);

  if (remaining.length === expenses.length) {
    return res.status(404).json({ error: "Expense not found" });
  }

  writeExpenses(remaining);
  res.json({ status: "deleted", id });
});

// ── Fallbacks ────────────────────────────────────────────────────

/** Unknown route → JSON 404 instead of Express's HTML page. */
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

/**
 * Central error handler. Turns malformed JSON bodies, disk failures and any
 * unexpected throw into a clean JSON response, and keeps stack traces in the
 * server log rather than sending them to the client.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof DataFileError) {
    console.error("[data]", err.message);
    return res.status(500).json({ error: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Startup ──────────────────────────────────────────────────────

/**
 * Starts the HTTP server, with a clear message if the port is already taken
 * and a graceful shutdown on Ctrl+C.
 * @returns {import("http").Server}
 */
function start() {
  ensureDataFile();

  const server = app.listen(PORT, () => {
    console.log(`PocketBudget running on http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process, or start ` +
          `this one with a different port:  PORT=3002 npm start`,
      );
      process.exit(1);
    }
    throw err;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`\n${signal} received — shutting down.`);
      server.close(() => process.exit(0));
    });
  }

  return server;
}

// Only listen when run directly, so tests can import the app.
if (require.main === module) {
  start();
}

module.exports = { app, start, DATA_FILE, ALLOWED_CATEGORIES };
