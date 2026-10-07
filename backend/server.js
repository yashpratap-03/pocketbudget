/**
 * PocketBudget backend – entry point
 * ==================================
 * Course : DLBCSPJWD01
 * Author : Yash Pratap Singh
 *
 * Starts the HTTP server. The application itself is assembled in src/app.js;
 * this file only handles start-up and shutdown.
 *
 *   src/config/        port, paths, categories, input limits
 *   src/storage/       JSON file access (atomic writes)
 *   src/validation/    rules for incoming data
 *   src/services/      business logic: create, filter, total, delete
 *   src/routes/        HTTP endpoints
 *   src/middleware/    404 and error handling
 */

"use strict";

const { PORT, DATA_FILE, ALLOWED_CATEGORIES } = require("./src/config");
const { createApp } = require("./src/app");

const { app, store } = createApp();

/**
 * Starts listening, with a clear message if the port is taken and a graceful
 * shutdown on Ctrl+C.
 * @returns {import("http").Server}
 */
function start() {
  store.ensureDataFile();

  const server = app.listen(PORT, () => {
    console.log(`PocketBudget running on http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process, or start ` +
          "this one with a different port:  PORT=3002 npm start",
      );
      process.exit(1);
    }
    throw err;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`\n${signal} received, shutting down.`);
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
