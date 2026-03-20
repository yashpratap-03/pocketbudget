/**
 * PocketBudget – Frontend Application
 * =====================================
 * Course : DLBCSPJWD01 – Phase 2
 * Author : Yash Pratap Singh
 *
 * Responsibilities:
 *  - Load and render expenses from the Express backend (GET /expenses)
 *  - Submit new expenses via the form (POST /expenses)
 *  - Delete expenses (DELETE /expenses/:id)
 *  - Filter expense list by month
 *  - Render a CSS-based horizontal bar chart for category totals
 *  - Track a user-defined monthly budget with a progress bar
 *  - Export the current view to a CSV file
 *  - Display toast notifications for user feedback
 */

"use strict";

// ── Configuration ─────────────────────────────────────────────
const API_BASE_URL = "http://localhost:3001";

// ── Category Visual Configuration ─────────────────────────────
/**
 * Defines the colour and background for each spending category.
 * Used for badges in the table and the bar chart.
 * @type {Record<string, { color: string, bg: string }>}
 */
const CATEGORY_CONFIG = {
  Food: { color: "#f97316", bg: "#fff7ed" },
  Transport: { color: "#0ea5e9", bg: "#f0f9ff" },
  Housing: { color: "#7c3aed", bg: "#f5f3ff" },
  Entertainment: { color: "#ec4899", bg: "#fdf2f8" },
  Health: { color: "#16a34a", bg: "#f0fdf4" },
  Shopping: { color: "#d97706", bg: "#fffbeb" },
  Education: { color: "#06b6d4", bg: "#ecfeff" },
  Other: { color: "#6b7280", bg: "#f9fafb" },
};

/** Fallback colour for categories not in CATEGORY_CONFIG */
const DEFAULT_CAT = { color: "#22813e", bg: "#edfaf2" };

// ── DOM Element References ─────────────────────────────────────
const expenseForm = document.getElementById("expenseForm");
const expenseTableBody = document.getElementById("expenseTableBody");
const totalAmountEl = document.getElementById("totalAmount");
const expenseCountEl = document.getElementById("expenseCount");
const avgAmountEl = document.getElementById("avgAmount");
const topCategoryEl = document.getElementById("topCategory");
const topCategoryAmtEl = document.getElementById("topCategoryAmt");
const budgetSublineEl = document.getElementById("budgetSubline");
const categoryChartEl = document.getElementById("categoryChart");
const monthFilterEl = document.getElementById("monthFilter");
const clearFilterBtn = document.getElementById("clearFilter");
const filteredNoteEl = document.getElementById("filteredNote");
const budgetInputEl = document.getElementById("budgetInput");
const setBudgetBtn = document.getElementById("setBudgetBtn");
const clearBudgetBtn = document.getElementById("clearBudgetBtn");
const budgetProgressSection = document.getElementById("budgetProgressSection");
const budgetProgressBar = document.getElementById("budgetProgressBar");
const budgetProgressLabel = document.getElementById("budgetProgressLabel");
const budgetWarningEl = document.getElementById("budgetWarning");
const exportBtn = document.getElementById("exportBtn");
const currentDateEl = document.getElementById("currentDate");

// ── Application State ──────────────────────────────────────────
/**
 * Monthly budget in euros.
 * Persisted in localStorage under the key "pb_budget".
 * @type {number}
 */
let monthlyBudget = parseFloat(localStorage.getItem("pb_budget")) || 0;

/**
 * The most recently fetched API response payload.
 * Used when exporting to CSV without needing a refetch.
 * @type {null | { count: number, totalAmount: number, totalsByCategory: Record<string, number>, expenses: Array }}
 */
let currentData = null;

// ── Initialisation ─────────────────────────────────────────────

// Display today's date in the top bar
currentDateEl.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Pre-fill the date input with today's date
document.getElementById("date").valueAsDate = new Date();

// Restore saved budget value into the input field
if (monthlyBudget > 0) {
  budgetInputEl.value = monthlyBudget;
}

// Kick off the initial data load
loadExpenses();

// ── Utility Functions ──────────────────────────────────────────

/**
 * Returns the colour config for a given category.
 * Falls back to DEFAULT_CAT if the category is unknown.
 * @param {string} category
 * @returns {{ color: string, bg: string }}
 */
function getCatConfig(category) {
  return CATEGORY_CONFIG[category] || DEFAULT_CAT;
}

/**
 * Builds an HTML badge <span> for a spending category.
 * @param {string} category
 * @returns {string} An HTML string with inline colour styles
 */
function makeBadge(category) {
  const { color, bg } = getCatConfig(category);
  return `<span class="badge" style="color:${color};background:${bg}">${category}</span>`;
}

/**
 * Formats a YYYY-MM-DD string to a human-readable date.
 * Parses the parts manually to avoid browser timezone shifts.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} e.g. "15 Mar 2026"
 */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Toast Notifications ────────────────────────────────────────

/**
 * Shows a self-dismissing toast notification at the bottom-right.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'} [type='info'] - Visual style
 * @param {number} [duration=3000] - Auto-dismiss delay in ms
 */
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Fade out and remove after the specified duration
  setTimeout(() => {
    toast.style.animation = "toastOut 0.35s ease forwards";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── Budget UI ──────────────────────────────────────────────────

/**
 * Updates the budget progress bar and related text.
 * Shows a warning if spending has exceeded the budget.
 * @param {number} totalSpent - Current total expenses for the period
 */
function updateBudgetUI(totalSpent) {
  if (monthlyBudget <= 0) {
    budgetProgressSection.classList.add("hidden");
    budgetSublineEl.textContent = "No budget set";
    return;
  }

  budgetProgressSection.classList.remove("hidden");

  const pct = Math.min((totalSpent / monthlyBudget) * 100, 100);
  const isOver = totalSpent > monthlyBudget;

  budgetProgressBar.style.width = `${pct}%`;
  budgetProgressBar.classList.toggle("over", isOver);
  budgetProgressLabel.textContent = `€${totalSpent.toFixed(2)} / €${monthlyBudget.toFixed(2)}`;
  budgetWarningEl.classList.toggle("hidden", !isOver);

  const remaining = monthlyBudget - totalSpent;
  budgetSublineEl.textContent = isOver
    ? `€${Math.abs(remaining).toFixed(2)} over budget`
    : `€${remaining.toFixed(2)} remaining`;
}

// ── Category Bar Chart ─────────────────────────────────────────

/**
 * Renders a horizontal bar chart inside #categoryChart.
 * Each row shows the category name, a proportional bar, and the amount.
 * @param {Record<string, number>} totals - Category → total amount
 * @param {number} grandTotal - Sum of all expenses (used for % calculation)
 */
function renderChart(totals, grandTotal) {
  if (!totals || Object.keys(totals).length === 0) {
    categoryChartEl.innerHTML = `<p class="chart-empty">No expenses yet — add one to see the chart!</p>`;
    return;
  }

  // Sort categories by spend amount, highest first
  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);
  const maxAmt = sorted[0][1]; // used to scale bar widths relative to the top

  categoryChartEl.innerHTML = sorted
    .map(([cat, amt]) => {
      const { color } = getCatConfig(cat);
      const barWidth = maxAmt > 0 ? ((amt / maxAmt) * 100).toFixed(1) : 0;
      const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : 0;
      return `
        <div class="chart-row">
          <span class="chart-label" title="${cat}">${cat}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill"
              style="width:${barWidth}%;background:${color}"></div>
          </div>
          <span class="chart-amount">€${amt.toFixed(2)}</span>
        </div>
        <div class="chart-pct">${pct}% of total</div>
      `;
    })
    .join("");
}

// ── Expense Table ──────────────────────────────────────────────

/**
 * Renders the expense rows inside the HTML table.
 * Expenses are sorted most-recent-first before rendering.
 * @param {Array<Object>} expenses - Expense objects from the API
 */
function renderTable(expenses) {
  if (expenses.length === 0) {
    expenseTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">No expenses found. Add your first one above!</td>
      </tr>`;
    return;
  }

  // Sort by date descending (most recent first)
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  expenseTableBody.innerHTML = sorted
    .map(
      (exp) => `
      <tr>
        <td>${formatDate(exp.date)}</td>
        <td>${makeBadge(exp.category)}</td>
        <td class="amount-cell">€${Number(exp.amount).toFixed(2)}</td>
        <td>${exp.note || '<span style="color:#c4c8bd">—</span>'}</td>
        <td>
          <button class="btn-danger" onclick="deleteExpense('${exp.id}')">
            Delete
          </button>
        </td>
      </tr>`,
    )
    .join("");
}

// ── Summary Stats ──────────────────────────────────────────────

/**
 * Updates the four summary stat cards at the top of the dashboard.
 * @param {Object} data - API response object
 */
function renderStats(data) {
  totalAmountEl.textContent = `€${Number(data.totalAmount).toFixed(2)}`;
  expenseCountEl.textContent = data.count;

  // Average per entry
  const avg = data.count > 0 ? data.totalAmount / data.count : 0;
  avgAmountEl.textContent = `€${avg.toFixed(2)}`;

  // Top spending category
  const totals = data.totalsByCategory;
  if (totals && Object.keys(totals).length > 0) {
    const [topCat, topAmt] = Object.entries(totals).sort(
      ([, a], [, b]) => b - a,
    )[0];
    topCategoryEl.textContent = topCat;
    topCategoryAmtEl.textContent = `€${topAmt.toFixed(2)} spent`;
  } else {
    topCategoryEl.textContent = "—";
    topCategoryAmtEl.textContent = "";
  }
}

// ── Data Loading ───────────────────────────────────────────────

/**
 * Fetches expenses from the backend and updates the entire UI.
 * Applies a month filter if one is selected in the filter input.
 */
async function loadExpenses() {
  try {
    const month = monthFilterEl.value;
    const url = month
      ? `${API_BASE_URL}/expenses?month=${month}`
      : `${API_BASE_URL}/expenses`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    currentData = data; // cache for CSV export

    // Update filter note chip
    if (month) {
      filteredNoteEl.textContent = `Filtered: ${month}`;
      filteredNoteEl.classList.remove("hidden");
    } else {
      filteredNoteEl.classList.add("hidden");
    }

    renderStats(data);
    renderChart(data.totalsByCategory, data.totalAmount);
    renderTable(data.expenses);
    updateBudgetUI(data.totalAmount);
  } catch (error) {
    console.error("loadExpenses failed:", error);
    showToast("Could not connect to the server.", "error");
  }
}

// ── Event Listeners ────────────────────────────────────────────

/**
 * Form submission: reads form fields, POSTs to the backend,
 * resets the form, and reloads the expense list.
 */
expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(expenseForm);
  const payload = {
    amount: data.get("amount"),
    category: data.get("category"),
    date: data.get("date"),
    note: data.get("note"),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add expense");
    }

    expenseForm.reset();
    document.getElementById("date").valueAsDate = new Date(); // reset date to today
    showToast("Expense added! 🎉", "success");
    loadExpenses();
  } catch (error) {
    console.error("Add expense failed:", error);
    showToast(`Error: ${error.message}`, "error");
  }
});

/** Month filter: reload data whenever the month selection changes */
monthFilterEl.addEventListener("change", loadExpenses);

/** Clear month filter and reload all expenses */
clearFilterBtn.addEventListener("click", () => {
  monthFilterEl.value = "";
  loadExpenses();
});

/**
 * Budget setter: validates the input, persists to localStorage,
 * and immediately updates the progress bar.
 */
setBudgetBtn.addEventListener("click", () => {
  const val = parseFloat(budgetInputEl.value);
  if (isNaN(val) || val <= 0) {
    showToast("Enter a valid budget amount.", "error");
    return;
  }
  monthlyBudget = val;
  localStorage.setItem("pb_budget", String(val));
  if (currentData) updateBudgetUI(currentData.totalAmount);
  showToast(`Budget set to €${val.toFixed(2)} ✅`, "success");
});

/** Clear the saved budget and hide the progress bar */
clearBudgetBtn.addEventListener("click", () => {
  monthlyBudget = 0;
  budgetInputEl.value = "";
  localStorage.removeItem("pb_budget");
  budgetProgressSection.classList.add("hidden");
  budgetSublineEl.textContent = "No budget set";
  showToast("Budget cleared.", "info");
});

/**
 * Export the currently displayed expenses to a CSV file.
 * Downloads automatically using a temporary <a> element.
 */
exportBtn.addEventListener("click", () => {
  if (!currentData || currentData.expenses.length === 0) {
    showToast("No data to export.", "info");
    return;
  }

  const headers = ["Date", "Category", "Amount (EUR)", "Note"];
  const rows = currentData.expenses.map((e) => [
    e.date,
    e.category,
    Number(e.amount).toFixed(2),
    e.note || "",
  ]);

  // Build CSV string with quoted fields to handle commas in notes
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `pocketbudget_${monthFilterEl.value || "all"}.csv`;
  link.click();

  showToast("Exported to CSV! 📥", "success");
});

// ── Delete ─────────────────────────────────────────────────────

/**
 * Sends a DELETE request to remove a single expense.
 * Asks for confirmation before proceeding.
 * @param {string} id - The UUID of the expense to delete
 */
async function deleteExpense(id) {
  if (!confirm("Delete this expense? This cannot be undone.")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok)
      throw new Error(`Server responded with ${response.status}`);

    showToast("Expense deleted.", "info");
    loadExpenses();
  } catch (error) {
    console.error("Delete failed:", error);
    showToast("Could not delete expense.", "error");
  }
}
