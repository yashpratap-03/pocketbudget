/**
 * Expense service: the business logic of the application.
 *
 * It decides how expenses are created, filtered, totalled and removed. It
 * knows nothing about HTTP (no req/res) and nothing about files (it receives
 * a store), which keeps each concern in one place.
 */

"use strict";

const crypto = require("node:crypto");
const { roundMoney } = require("../utils/money");

// Stored records are treated as untrusted: a hand-edited file must never
// crash a request or poison a total.

/** @returns {number} a finite amount, or 0 for anything unusable */
function safeAmount(entry) {
  const value = Number(entry.amount);
  return Number.isFinite(value) ? value : 0;
}

/** @returns {string} the date string, or "" if absent */
function safeDate(entry) {
  return typeof entry.date === "string" ? entry.date : "";
}

/** @returns {string} the category, or "Other" if absent */
function safeCategory(entry) {
  return typeof entry.category === "string" && entry.category.trim() !== ""
    ? entry.category
    : "Other";
}

/**
 * Applies the optional month and category filters.
 * @param {Array<Object>} expenses
 * @param {{ month?: string|null, category?: string }} filters
 */
function filterExpenses(expenses, { month, category } = {}) {
  let result = expenses;
  if (month) {
    result = result.filter((e) => safeDate(e).startsWith(month));
  }
  if (category !== undefined && category !== "") {
    const wanted = String(category).trim().toLowerCase();
    result = result.filter((e) => safeCategory(e).toLowerCase() === wanted);
  }
  return result;
}

/**
 * Builds the summary the frontend renders.
 * @param {Array<Object>} expenses
 * @returns {{ count:number, totalAmount:number, totalsByCategory:Object, expenses:Array }}
 */
function summarise(expenses) {
  const totalsByCategory = {};
  let total = 0;

  for (const e of expenses) {
    const amount = safeAmount(e);
    const category = safeCategory(e);
    total += amount;
    totalsByCategory[category] = (totalsByCategory[category] || 0) + amount;
  }
  for (const category of Object.keys(totalsByCategory)) {
    totalsByCategory[category] = roundMoney(totalsByCategory[category]);
  }

  return {
    count: expenses.length,
    totalAmount: roundMoney(total),
    totalsByCategory,
    expenses,
  };
}

/**
 * Creates the service around a store from storage/expenseStore.js.
 * @param {{ readAll: Function, writeAll: Function }} store
 */
function createExpenseService(store) {
  return {
    /** Lists expenses with optional filters, plus totals. */
    list(filters) {
      return summarise(filterExpenses(store.readAll(), filters));
    },

    /**
     * Stores an already-validated expense and returns it.
     * @param {{ amount:number, category:string, date:string, note:string }} input
     */
    create(input) {
      const expense = {
        id: crypto.randomUUID(),
        amount: input.amount,
        category: input.category,
        date: input.date,
        note: input.note,
        createdAt: new Date().toISOString(),
      };
      const expenses = store.readAll();
      expenses.push(expense);
      store.writeAll(expenses);
      return expense;
    },

    /**
     * Removes one expense.
     * @returns {boolean} false if no expense had that id
     */
    remove(id) {
      const expenses = store.readAll();
      const remaining = expenses.filter((e) => e.id !== id);
      if (remaining.length === expenses.length) return false;
      store.writeAll(remaining);
      return true;
    },
  };
}

module.exports = { createExpenseService, filterExpenses, summarise };
