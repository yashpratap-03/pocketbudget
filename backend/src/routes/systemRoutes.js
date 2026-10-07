/**
 * Small routes that are not about expenses themselves: health check and the
 * category list the frontend can use to stay in sync with the backend.
 */

"use strict";

const express = require("express");
const { ALLOWED_CATEGORIES } = require("../config");

function createSystemRouter() {
  const router = express.Router();

  /** GET /health → liveness probe */
  router.get("/health", (req, res) => {
    res.json({ status: "ok", message: "PocketBudget backend is running" });
  });

  /** GET /api/categories → the accepted category list */
  router.get("/api/categories", (req, res) => {
    res.json({ categories: ALLOWED_CATEGORIES });
  });

  return router;
}

module.exports = { createSystemRouter };
