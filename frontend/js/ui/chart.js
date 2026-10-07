/**
 * Horizontal bar chart of spending per category, built from DOM elements.
 */

import { dom } from "../dom.js";
import { formatEuro, getCategoryStyle, sortCategoryTotals } from "../utils/format.js";

/**
 * @param {Record<string, number>} totals category → amount
 * @param {number} grandTotal used for each category's share
 */
export function renderChart(totals, grandTotal) {
  const container = dom.categoryChart;
  container.textContent = "";

  const sorted = sortCategoryTotals(totals);
  if (sorted.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "No expenses yet — add one to see the chart!";
    container.appendChild(empty);
    return;
  }

  const maxAmt = sorted[0][1]; // the largest bar fills the track
  const total = Number(grandTotal);
  const fragment = document.createDocumentFragment();

  for (const [cat, amt] of sorted) {
    const barWidth = maxAmt > 0 ? ((amt / maxAmt) * 100).toFixed(1) : "0";
    const pct = Number.isFinite(total) && total > 0 ? ((amt / total) * 100).toFixed(1) : "0";

    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.className = "chart-label";
    label.title = cat;
    label.textContent = cat;

    const track = document.createElement("div");
    track.className = "chart-bar-track";
    const fill = document.createElement("div");
    fill.className = "chart-bar-fill";
    fill.style.width = `${barWidth}%`;
    fill.style.background = getCategoryStyle(cat).color;
    track.appendChild(fill);

    const amountEl = document.createElement("span");
    amountEl.className = "chart-amount";
    amountEl.textContent = formatEuro(amt);

    row.append(label, track, amountEl);

    const pctEl = document.createElement("div");
    pctEl.className = "chart-pct";
    pctEl.textContent = `${pct}% of total`;

    fragment.append(row, pctEl);
  }

  container.appendChild(fragment);
}
