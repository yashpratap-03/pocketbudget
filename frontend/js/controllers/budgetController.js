/**
 * Budget controller: sets and clears the monthly budget.
 *
 * The budget is a browser-side setting (saved in localStorage), so these
 * handlers never call the backend. They re-render the progress bar from the
 * totals of the last API response held in state.
 */

import { dom } from "../dom.js";
import { state, saveBudget, clearSavedBudget } from "../state.js";
import { validateBudget } from "../utils/validation.js";
import { formatEuro } from "../utils/format.js";
import { renderBudget } from "../ui/budget.js";
import { showToast } from "../ui/toast.js";

/** Total of the expenses currently shown, or 0 before the first load. */
const currentTotal = () => (state.currentData ? state.currentData.totalAmount : 0);

/** "Set Budget" button handler. */
export function setBudget() {
  const result = validateBudget(dom.budgetInput.value);
  if (!result.ok) {
    showToast(result.error, "error");
    return;
  }

  saveBudget(result.value);
  renderBudget(currentTotal(), state.monthlyBudget);
  showToast(`Budget set to ${formatEuro(result.value)}`, "success");
}

/** "Clear budget" button handler. */
export function clearBudget() {
  clearSavedBudget();
  dom.budgetInput.value = "";
  renderBudget(currentTotal(), state.monthlyBudget);
  showToast("Budget cleared.", "info");
}
