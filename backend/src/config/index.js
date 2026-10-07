/**
 * Application configuration.
 *
 * Every tunable value lives here so that no other module hard-codes a port,
 * a path or a validation limit. Values that differ between environments can
 * be overridden with environment variables.
 */

"use strict";

const path = require("node:path");

/** Root of the backend folder (one level up from src/). */
const BACKEND_ROOT = path.join(__dirname, "..", "..");

/** Port the HTTP server listens on. Override with PORT=3002. */
const PORT = Number(process.env.PORT) || 3001;

/** Folder that holds the browser frontend (index.html, style.css, js/). */
const FRONTEND_DIR = path.join(BACKEND_ROOT, "..", "frontend");

/**
 * Location of the JSON data store. The test suite overrides this with
 * DATA_FILE so it never touches the real data.
 */
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(BACKEND_ROOT, "data", "expenses.json");

/** Categories the UI offers. Any other category is rejected. */
const ALLOWED_CATEGORIES = Object.freeze([
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Other",
]);

/** Guard rails on user input. */
const LIMITS = Object.freeze({
  MAX_AMOUNT: 1_000_000, // a single expense above this is treated as a typo
  MAX_NOTE_LENGTH: 200,
  MIN_YEAR: 1970,
  MAX_YEAR: 2100,
  MAX_BODY_SIZE: "100kb",
});

module.exports = {
  PORT,
  FRONTEND_DIR,
  DATA_FILE,
  ALLOWED_CATEGORIES,
  LIMITS,
};
