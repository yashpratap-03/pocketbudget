/**
 * The monthly budget progress bar and the "remaining / over budget" line.
 */

import { dom } from "../dom.js";
import { formatEuro } from "../utils/format.js";

/**
 * @param {number} totalSpent spending in the current view
 * @param {number} budget monthly budget, 0 when none is set
 */
export function renderBudget(totalSpent, budget) {
  const spent = Number.isFinite(Number(totalSpent)) ? Number(totalSpent) : 0;

  if (budget <= 0) {
    dom.budgetProgressSection.classList.add("hidden");
    dom.budgetSubline.textContent = "No budget set";
    return;
  }

  dom.budgetProgressSection.classList.remove("hidden");

  const pct = Math.min((spent / budget) * 100, 100);
  const isOver = spent > budget;

  dom.budgetProgressBar.style.width = `${pct}%`;
  dom.budgetProgressBar.classList.toggle("over", isOver);
  dom.budgetProgressLabel.textContent = `${formatEuro(spent)} / ${formatEuro(budget)}`;
  dom.budgetWarning.classList.toggle("hidden", !isOver);

  // Keep assistive technology in step with the visual bar.
  const track = dom.budgetProgressBar.parentElement;
  if (track) {
    track.setAttribute("aria-valuenow", String(Math.round(pct)));
    track.setAttribute("aria-valuetext", `${Math.round(pct)}% of budget used`);
  }

  const remaining = budget - spent;
  dom.budgetSubline.textContent = isOver
    ? `${formatEuro(Math.abs(remaining))} over budget`
    : `${formatEuro(remaining)} remaining`;
}
