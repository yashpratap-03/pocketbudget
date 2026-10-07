/**
 * Expense controller: the three dynamic interactions with the backend.
 *
 *   loadExpenses()   GET    /expenses   (optionally filtered by month)
 *   addExpense()     POST   /expenses
 *   removeExpense()  DELETE /expenses/:id
 *
 * A controller connects the other layers: it reads input from the DOM, checks
 * it with the validation utils, calls the API service, stores the result in
 * state and asks the UI modules to render. It contains no fetch calls and
 * builds no HTML itself.
 */

import { dom } from "../dom.js";
import { state } from "../state.js";
import * as api from "../services/api.js";
import { validateExpenseForm } from "../utils/validation.js";
import { toLocalIsoDate } from "../utils/format.js";
import { renderStats } from "../ui/stats.js";
import { renderChart } from "../ui/chart.js";
import { renderTable, renderTableMessage, renderFilterNote } from "../ui/table.js";
import { renderBudget } from "../ui/budget.js";
import { showToast } from "../ui/toast.js";

/**
 * Fetches expenses (respecting the month filter) and re-renders the whole
 * dashboard from the response.
 */
export async function loadExpenses() {
  const month = dom.monthFilter.value;

  try {
    const data = await api.fetchExpenses(month);
    state.currentData = data; // kept for the CSV export

    renderFilterNote(month);
    renderStats(data);
    renderChart(data.totalsByCategory, data.totalAmount);
    renderTable(data.expenses);
    renderBudget(data.totalAmount, state.monthlyBudget);
  } catch (error) {
    console.error("loadExpenses failed:", error);
    state.currentData = null;
    renderTableMessage("Could not load expenses. Check that the backend is running, then reload.");
    showToast(error.message, "error");
  }
}

/**
 * Submit handler for the add-expense form. The button is disabled while the
 * request is in flight so a double click cannot create two expenses.
 * @param {SubmitEvent} event
 */
export async function addExpense(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  const result = validateExpenseForm({
    amount: dom.amountInput.value,
    category: dom.categoryInput.value,
    date: dom.dateInput.value,
    note: dom.noteInput.value,
  });
  if (!result.ok) {
    showToast(result.error, "error");
    return;
  }

  state.isSubmitting = true;
  const originalLabel = dom.submitBtn.textContent;
  dom.submitBtn.disabled = true;
  dom.submitBtn.textContent = "Adding…";

  try {
    await api.createExpense(result.payload);
    dom.expenseForm.reset();
    dom.dateInput.value = toLocalIsoDate();
    showToast("Expense added!", "success");
    await loadExpenses();
  } catch (error) {
    console.error("addExpense failed:", error);
    showToast(error.message, "error");
  } finally {
    state.isSubmitting = false;
    dom.submitBtn.disabled = false;
    dom.submitBtn.textContent = originalLabel;
  }
}

/**
 * Click handler for the expense table. Uses event delegation: one listener
 * on the table body handles every Delete button, including rows rendered
 * later.
 * @param {MouseEvent} event
 */
export async function removeExpense(event) {
  const button = event.target.closest("button.btn-danger");
  const id = button?.dataset.id;
  if (!id) return;
  if (!window.confirm("Delete this expense? This cannot be undone.")) return;

  button.disabled = true;
  try {
    await api.deleteExpense(id);
    showToast("Expense deleted.", "info");
    await loadExpenses();
  } catch (error) {
    console.error("removeExpense failed:", error);
    showToast(error.message, "error");
    button.disabled = false;
  }
}

/** Clears the month filter and reloads all expenses. */
export function clearMonthFilter() {
  if (!dom.monthFilter.value) return;
  dom.monthFilter.value = "";
  loadExpenses();
}
