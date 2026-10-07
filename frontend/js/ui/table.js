/**
 * The "All Expenses" table and its filter chip.
 *
 * Values from the API are always inserted with textContent, never innerHTML,
 * so stored text can never run as markup.
 */

import { dom } from "../dom.js";
import { formatDate, formatEuro, getCategoryStyle } from "../utils/format.js";

/**
 * Shows a single full-width message row (loading, empty or error).
 * @param {string} message
 */
export function renderTableMessage(message) {
  const row = document.createElement("tr");
  row.className = "empty-row";
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);
  dom.expenseTableBody.replaceChildren(row);
}

/** @param {string} category */
function makeBadge(category) {
  const { color, bg } = getCategoryStyle(category);
  const span = document.createElement("span");
  span.className = "badge";
  span.style.color = color;
  span.style.background = bg;
  span.textContent = category;
  return span;
}

/** Builds one table row for an expense. */
function makeRow(exp) {
  const row = document.createElement("tr");

  const dateCell = document.createElement("td");
  dateCell.textContent = formatDate(exp.date);

  const categoryCell = document.createElement("td");
  categoryCell.appendChild(makeBadge(String(exp.category ?? "Other")));

  const amountCell = document.createElement("td");
  amountCell.className = "amount-cell";
  amountCell.textContent = formatEuro(exp.amount);

  const noteCell = document.createElement("td");
  if (exp.note) {
    noteCell.textContent = String(exp.note);
  } else {
    const dash = document.createElement("span");
    dash.className = "note-empty";
    dash.textContent = "—";
    noteCell.appendChild(dash);
  }

  const actionCell = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-danger";
  deleteBtn.dataset.id = String(exp.id ?? ""); // read by the delegated click handler
  deleteBtn.textContent = "Delete";
  actionCell.appendChild(deleteBtn);

  row.append(dateCell, categoryCell, amountCell, noteCell, actionCell);
  return row;
}

/**
 * Renders all expenses, most recent first (ties broken by creation time).
 * @param {Array<Object>} expenses
 */
export function renderTable(expenses) {
  const list = Array.isArray(expenses) ? expenses : [];
  if (list.length === 0) {
    renderTableMessage("No expenses found. Add your first one above!");
    return;
  }

  const sorted = [...list].sort((a, b) => {
    const byDate = String(b.date ?? "").localeCompare(String(a.date ?? ""));
    return byDate !== 0 ? byDate : String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });

  dom.expenseTableBody.replaceChildren(...sorted.map(makeRow));
}

/**
 * Shows or hides the "Filtered: YYYY-MM" chip above the table.
 * @param {string} month empty string when no filter is active
 */
export function renderFilterNote(month) {
  dom.filteredNote.textContent = month ? `Filtered: ${month}` : "";
  dom.filteredNote.classList.toggle("hidden", !month);
}
