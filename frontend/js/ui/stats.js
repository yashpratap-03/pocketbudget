/**
 * The four summary cards at the top of the dashboard.
 */

import { dom } from "../dom.js";
import { formatEuro, sortCategoryTotals } from "../utils/format.js";

/**
 * @param {{ count:number, totalAmount:number, totalsByCategory:Object }} data
 */
export function renderStats(data) {
  const total = Number(data.totalAmount);
  const count = Number(data.count);

  dom.totalAmount.textContent = formatEuro(total);
  dom.expenseCount.textContent = String(Number.isFinite(count) ? count : 0);
  dom.avgAmount.textContent = formatEuro(Number.isFinite(total) && count > 0 ? total / count : 0);

  const [top] = sortCategoryTotals(data.totalsByCategory);
  if (top) {
    dom.topCategory.textContent = top[0];
    dom.topCategoryAmt.textContent = `${formatEuro(top[1])} spent`;
  } else {
    dom.topCategory.textContent = "—";
    dom.topCategoryAmt.textContent = "";
  }
}
