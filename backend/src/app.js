/**
 * Builds the Express application by wiring the modules together:
 * config → store → service → routes, plus middleware and error handling.
 *
 * Building the app in a function (instead of at import time) lets the tests
 * create an app against a scratch data file.
 */

"use strict";

const path = require("node:path");
const express = require("express");
const cors = require("cors");

const config = require("./config");
const { createExpenseStore } = require("./storage/expenseStore");
const { createExpenseService } = require("./services/expenseService");
const { createExpenseRouter } = require("./routes/expenseRoutes");
const { createSystemRouter } = require("./routes/systemRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandlers");

/**
 * @param {{ dataFile?: string, frontendDir?: string }} [options]
 * @returns {{ app: import("express").Express, store: Object }}
 */
function createApp(options = {}) {
  const dataFile = options.dataFile || config.DATA_FILE;
  const frontendDir = options.frontendDir || config.FRONTEND_DIR;

  const store = createExpenseStore(dataFile);
  const service = createExpenseService(store);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: config.LIMITS.MAX_BODY_SIZE }));

  // Serve only the public frontend files, not the frontend tests.
  app.get("/", (req, res) => res.sendFile(path.join(frontendDir, "index.html")));
  app.get("/style.css", (req, res) => res.sendFile(path.join(frontendDir, "style.css")));
  app.use("/js", express.static(path.join(frontendDir, "js")));

  app.use(createSystemRouter());
  app.use("/expenses", createExpenseRouter(service));

  app.use(notFound);
  app.use(errorHandler);

  return { app, store };
}

module.exports = { createApp };
