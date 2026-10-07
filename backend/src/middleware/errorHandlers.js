/**
 * Fallback middleware: JSON 404 for unknown routes and a central error
 * handler that turns any thrown error into a clean JSON response. Stack traces
 * stay in the server log and are never sent to the browser.
 */

"use strict";

const { DataFileError } = require("../storage/expenseStore");

/** Unknown route → JSON 404 instead of Express's HTML page. */
function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

/** Central error handler (Express recognises it by its four arguments). */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
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
}

module.exports = { notFound, errorHandler };
