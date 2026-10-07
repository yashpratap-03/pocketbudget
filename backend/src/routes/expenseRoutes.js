/**
 * HTTP routes for /expenses.
 *
 * Each handler translates between HTTP and the service: it reads the request,
 * asks validation whether the input is acceptable, calls the service, and
 * picks the status code. No business logic or file access lives here.
 */

"use strict";

const express = require("express");
const {
  validateExpenseInput,
  validateMonthFilter,
} = require("../validation/expenseValidation");

/** Express collects repeated query params into arrays; use only the first. */
const firstValue = (param) => (Array.isArray(param) ? param[0] : param);

/**
 * @param {ReturnType<import("../services/expenseService").createExpenseService>} service
 * @returns {import("express").Router}
 */
function createExpenseRouter(service) {
  const router = express.Router();

  /** GET /expenses?month=YYYY-MM&category=Food → list with totals */
  router.get("/", (req, res) => {
    const month = validateMonthFilter(firstValue(req.query.month));
    if (!month.ok) return res.status(400).json({ error: month.error });

    res.json(
      service.list({ month: month.value, category: firstValue(req.query.category) }),
    );
  });

  /** POST /expenses → 201 with the created expense, or 400 { error } */
  router.post("/", (req, res) => {
    const input = validateExpenseInput(req.body);
    if (!input.ok) return res.status(400).json({ error: input.error });

    res.status(201).json(service.create(input.value));
  });

  /** DELETE /expenses/:id → 200, or 404 if the id does not exist */
  router.delete("/:id", (req, res) => {
    if (!service.remove(req.params.id)) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ status: "deleted", id: req.params.id });
  });

  return router;
}

module.exports = { createExpenseRouter };
