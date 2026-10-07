/**
 * PocketBudget frontend: entry point
 * ==================================
 * Course : DLBCSPJWD01
 * Author : Yash Pratap Singh
 *
 * Loaded by index.html as an ES module. This file only prepares the page and
 * connects DOM events to controller functions; the logic lives in the layers
 * below:
 *
 *   config.js       constants (API base URL, limits, category colours)
 *   dom.js          every DOM element reference, looked up once
 *   state.js        shared state (budget, last API response)
 *   services/       API client and safe localStorage access
 *   controllers/    what happens when the user acts
 *   ui/             rendering of stats, chart, table, budget bar, toasts
 *   utils/          pure helpers: formatting, validation, CSV
 */

import { dom } from "./dom.js";
import { state, loadSavedBudget } from "./state.js";
import { toLocalIsoDate } from "./utils/format.js";
import { renderTableMessage } from "./ui/table.js";
import {
  loadExpenses,
  addExpense,
  removeExpense,
  clearMonthFilter,
} from "./controllers/expenseController.js";
import { setBudget, clearBudget } from "./controllers/budgetController.js";
import { exportCsv } from "./controllers/exportController.js";

/** Sets up the static parts of the page before the first data load. */
function initPage() {
  dom.currentDate.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  dom.dateInput.value = toLocalIsoDate();

  loadSavedBudget();
  if (state.monthlyBudget > 0) {
    dom.budgetInput.value = String(state.monthlyBudget);
  }

  renderTableMessage("Loading expenses…");
}

/** Connects every user action to its controller. */
function bindEvents() {
  dom.expenseForm.addEventListener("submit", addExpense);
  dom.expenseTableBody.addEventListener("click", removeExpense);
  dom.monthFilter.addEventListener("change", loadExpenses);
  dom.clearFilterBtn.addEventListener("click", clearMonthFilter);
  dom.setBudgetBtn.addEventListener("click", setBudget);
  dom.clearBudgetBtn.addEventListener("click", clearBudget);
  dom.exportBtn.addEventListener("click", exportCsv);
}

initPage();
bindEvents();
loadExpenses();
