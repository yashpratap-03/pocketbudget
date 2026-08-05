/**
 * PocketBudget – Frontend Application
 * =====================================
 * Course : DLBCSPJWD01
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
 *
 * All values that originate from the API are inserted with textContent (never
 * innerHTML), so stored text can never be executed as markup.
 */

"use strict";

// ── Configuration ─────────────────────────────────────────────
/** Where the backend API lives. Must match the PORT the server listens on. */
const API_BASE_URL = "http://localhost:3001";

/** Abort a request that hangs, so the UI never sticks on "Loading…". */
const REQUEST_TIMEOUT_MS = 8000;

/** Input limits — must stay in sync with the guard rails in backend/server.js. */
const MAX_NOTE_LENGTH = 200;
const MAX_AMOUNT = 1000000;

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
const submitBtn = document.getElementById("submitBtn");
const amountInputEl = document.getElementById("amount");
const categoryInputEl = document.getElementById("category");
const dateInputEl = document.getElementById("date");
const noteInputEl = document.getElementById("note");
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

// ── Safe localStorage ──────────────────────────────────────────
// Private-browsing modes and file:// pages can make localStorage throw on
// access, which previously would have stopped the whole script from running.

/**
 * @param {string} key
 * @returns {string | null}
 */
function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** @param {string} key @param {string} value */
function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* budget simply will not persist between reloads */
  }
}

/** @param {string} key */
function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

// ── Application State ──────────────────────────────────────────
/**
 * Monthly budget in euros. Persisted in localStorage under "pb_budget".
 * @type {number}
 */
let monthlyBudget = 0;
const savedBudget = Number.parseFloat(storageGet("pb_budget") ?? "");
if (Number.isFinite(savedBudget) && savedBudget > 0) {
  monthlyBudget = savedBudget;
}

/**
 * The most recently fetched API response payload.
 * Used when exporting to CSV without needing a refetch.
 * @type {null | { count: number, totalAmount: number, totalsByCategory: Record<string, number>, expenses: Array }}
 */
let currentData = null;

/** Guards against double submits while a POST is in flight. */
let isSubmitting = false;

// ── Utility Functions ──────────────────────────────────────────

/**
 * Formats a number as euros, tolerating non-numeric input from the store.
 * @param {unknown} value
 * @returns {string} e.g. "€15.50"
 */
function formatEuro(value) {
  const num = Number(value);
  return `€${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

/**
 * Returns the colour config for a given category.
 * @param {string} category
 * @returns {{ color: string, bg: string }}
 */
function getCatConfig(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_CONFIG, category)
    ? CATEGORY_CONFIG[category]
    : DEFAULT_CAT;
}

/**
 * Formats a YYYY-MM-DD string to a human-readable date.
 * Parses the parts manually to avoid browser timezone shifts, and returns the
 * raw string unchanged if it is not a valid date rather than "Invalid Date".
 * @param {unknown} dateStr - Date in YYYY-MM-DD format
 * @returns {string} e.g. "15 Mar 2026"
 */
function formatDate(dateStr) {
  if (typeof dateStr !== "string") return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return dateStr || "—";

  const [y, m, d] = match.slice(1).map(Number);
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Builds a category badge element with its colour styling.
 * @param {string} category
 * @returns {HTMLSpanElement}
 */
function makeBadge(category) {
  const { color, bg } = getCatConfig(category);
  const span = document.createElement("span");
  span.className = "badge";
  span.style.color = color;
  span.style.background = bg;
  span.textContent = category; // text, never markup
  return span;
}

/**
 * Wraps fetch with a timeout so a dead or hanging server surfaces as an
 * error toast instead of an indefinite wait.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The server took too long to respond.");
    }
    throw new Error("Could not reach the server. Is the backend running?");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads an { error } message out of a failed response, falling back to a
 * generic message if the body is not JSON.
 * @param {Response} response
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function errorMessageFrom(response, fallback) {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* not a JSON body */
  }
  return `${fallback} (HTTP ${response.status})`;
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
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  container.appendChild(toast);

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
  const spent = Number.isFinite(Number(totalSpent)) ? Number(totalSpent) : 0;

  if (monthlyBudget <= 0) {
    budgetProgressSection.classList.add("hidden");
    budgetSublineEl.textContent = "No budget set";
    return;
  }

  budgetProgressSection.classList.remove("hidden");

  const pct = Math.min((spent / monthlyBudget) * 100, 100);
  const isOver = spent > monthlyBudget;

  budgetProgressBar.style.width = `${pct}%`;
  budgetProgressBar.classList.toggle("over", isOver);
  budgetProgressLabel.textContent = `${formatEuro(spent)} / ${formatEuro(monthlyBudget)}`;
  budgetWarningEl.classList.toggle("hidden", !isOver);

  // Keep assistive technology in step with the visual bar.
  const track = budgetProgressBar.parentElement;
  if (track) {
    track.setAttribute("aria-valuenow", String(Math.round(pct)));
    track.setAttribute("aria-valuetext", `${Math.round(pct)}% of budget used`);
  }

  const remaining = monthlyBudget - spent;
  budgetSublineEl.textContent = isOver
    ? `${formatEuro(Math.abs(remaining))} over budget`
    : `${formatEuro(remaining)} remaining`;
}

// ── Category Bar Chart ─────────────────────────────────────────

/**
 * Renders a horizontal bar chart inside #categoryChart.
 * Each row shows the category name, a proportional bar, and the amount.
 * @param {Record<string, number>} totals - Category → total amount
 * @param {number} grandTotal - Sum of all expenses (used for % calculation)
 */
function renderChart(totals, grandTotal) {
  categoryChartEl.textContent = "";

  const entries = Object.entries(totals || {}).filter(([, amt]) =>
    Number.isFinite(Number(amt)),
  );

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "No expenses yet — add one to see the chart!";
    categoryChartEl.appendChild(empty);
    return;
  }

  // Sort categories by spend amount, highest first
  const sorted = entries.sort(([, a], [, b]) => Number(b) - Number(a));
  const maxAmt = Number(sorted[0][1]); // scales bar widths relative to the top
  const total = Number(grandTotal);

  const fragment = document.createDocumentFragment();

  for (const [cat, rawAmt] of sorted) {
    const amt = Number(rawAmt);
    const { color } = getCatConfig(cat);
    const barWidth = maxAmt > 0 ? ((amt / maxAmt) * 100).toFixed(1) : "0";
    const pct =
      Number.isFinite(total) && total > 0
        ? ((amt / total) * 100).toFixed(1)
        : "0";

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
    fill.style.background = color;
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

  categoryChartEl.appendChild(fragment);
}

// ── Expense Table ──────────────────────────────────────────────

/**
 * Renders a single-cell message row (empty state, loading, error).
 * @param {string} message
 */
function renderTableMessage(message) {
  expenseTableBody.textContent = "";
  const row = document.createElement("tr");
  row.className = "empty-row";
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);
  expenseTableBody.appendChild(row);
}

/**
 * Renders the expense rows inside the HTML table.
 * Expenses are sorted most-recent-first before rendering.
 * @param {Array<Object>} expenses - Expense objects from the API
 */
function renderTable(expenses) {
  const list = Array.isArray(expenses) ? expenses : [];

  if (list.length === 0) {
    renderTableMessage("No expenses found. Add your first one above!");
    return;
  }

  // Sort by date descending (most recent first); ties fall back to createdAt.
  const sorted = [...list].sort((a, b) => {
    const dateDiff = String(b.date ?? "").localeCompare(String(a.date ?? ""));
    if (dateDiff !== 0) return dateDiff;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });

  const fragment = document.createDocumentFragment();

  for (const exp of sorted) {
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
      dash.style.color = "#c4c8bd";
      dash.textContent = "—";
      noteCell.appendChild(dash);
    }

    const actionCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger";
    // Delegated listener on the tbody reads this, so no inline onclick and no
    // string interpolation of API data into markup.
    deleteBtn.dataset.id = String(exp.id ?? "");
    deleteBtn.textContent = "Delete";
    actionCell.appendChild(deleteBtn);

    row.append(dateCell, categoryCell, amountCell, noteCell, actionCell);
    fragment.appendChild(row);
  }

  expenseTableBody.textContent = "";
  expenseTableBody.appendChild(fragment);
}

// ── Summary Stats ──────────────────────────────────────────────

/**
 * Updates the four summary stat cards at the top of the dashboard.
 * @param {Object} data - API response object
 */
function renderStats(data) {
  const total = Number(data.totalAmount);
  const count = Number(data.count);

  totalAmountEl.textContent = formatEuro(total);
  expenseCountEl.textContent = String(Number.isFinite(count) ? count : 0);

  const avg = Number.isFinite(total) && count > 0 ? total / count : 0;
  avgAmountEl.textContent = formatEuro(avg);

  const totals = data.totalsByCategory;
  const entries = Object.entries(totals || {});
  if (entries.length > 0) {
    const [topCat, topAmt] = entries.sort(
      ([, a], [, b]) => Number(b) - Number(a),
    )[0];
    topCategoryEl.textContent = topCat;
    topCategoryAmtEl.textContent = `${formatEuro(topAmt)} spent`;
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
  const month = monthFilterEl.value;

  try {
    const url = month
      ? `${API_BASE_URL}/expenses?month=${encodeURIComponent(month)}`
      : `${API_BASE_URL}/expenses`;

    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(await errorMessageFrom(response, "Could not load expenses"));
    }

    const data = await response.json();
    currentData = data; // cache for CSV export

    // Update filter note chip
    if (month) {
      filteredNoteEl.textContent = `Filtered: ${month}`;
      filteredNoteEl.classList.remove("hidden");
    } else {
      filteredNoteEl.textContent = "";
      filteredNoteEl.classList.add("hidden");
    }

    renderStats(data);
    renderChart(data.totalsByCategory, data.totalAmount);
    renderTable(data.expenses);
    updateBudgetUI(data.totalAmount);
  } catch (error) {
    console.error("loadExpenses failed:", error);
    currentData = null;
    renderTableMessage(
      "Could not load expenses. Check that the backend is running, then reload.",
    );
    showToast(error.message || "Could not connect to the server.", "error");
  }
}

// ── Form Validation ────────────────────────────────────────────

/**
 * Validates the add-expense form. The form also carries native HTML
 * constraints, but this runs regardless of browser behaviour and mirrors the
 * server-side rules so the user gets the same answer either way.
 * @returns {{ ok: true, payload: Object } | { ok: false, error: string }}
 */
function validateForm() {
  const amount = Number.parseFloat(amountInputEl.value);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: "Please enter an amount." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Amount must be greater than 0." };
  }
  if (amount > MAX_AMOUNT) {
    return {
      ok: false,
      error: `Amount must not exceed €${MAX_AMOUNT.toLocaleString()}.`,
    };
  }

  const category = categoryInputEl.value;
  if (!category) {
    return { ok: false, error: "Please choose a category." };
  }

  const date = dateInputEl.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Please pick a valid date." };
  }

  const note = noteInputEl.value.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    payload: { amount, category, date, note },
  };
}

// ── Event Listeners ────────────────────────────────────────────

/**
 * Form submission: validates the fields, POSTs to the backend, resets the
 * form, and reloads the expense list. The button is disabled while the
 * request is in flight so a double click cannot create two expenses.
 */
expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const result = validateForm();
  if (!result.ok) {
    showToast(result.error, "error");
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Adding…";

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.payload),
    });

    if (!response.ok) {
      throw new Error(await errorMessageFrom(response, "Failed to add expense"));
    }

    expenseForm.reset();
    dateInputEl.valueAsDate = new Date(); // reset date to today
    showToast("Expense added!", "success");
    await loadExpenses();
  } catch (error) {
    console.error("Add expense failed:", error);
    showToast(error.message || "Failed to add expense", "error");
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

/** Month filter: reload data whenever the month selection changes */
monthFilterEl.addEventListener("change", loadExpenses);

/** Clear month filter and reload all expenses */
clearFilterBtn.addEventListener("click", () => {
  if (!monthFilterEl.value) return;
  monthFilterEl.value = "";
  loadExpenses();
});

/**
 * Budget setter: validates the input, persists to localStorage,
 * and immediately updates the progress bar.
 */
setBudgetBtn.addEventListener("click", () => {
  const val = Number.parseFloat(budgetInputEl.value);
  if (!Number.isFinite(val) || val <= 0) {
    showToast("Enter a valid budget amount.", "error");
    return;
  }
  if (val > MAX_AMOUNT) {
    showToast(`Budget must not exceed €${MAX_AMOUNT.toLocaleString()}.`, "error");
    return;
  }

  monthlyBudget = Math.round(val * 100) / 100;
  storageSet("pb_budget", String(monthlyBudget));
  updateBudgetUI(currentData ? currentData.totalAmount : 0);
  showToast(`Budget set to ${formatEuro(monthlyBudget)}`, "success");
});

/** Clear the saved budget and hide the progress bar */
clearBudgetBtn.addEventListener("click", () => {
  monthlyBudget = 0;
  budgetInputEl.value = "";
  storageRemove("pb_budget");
  budgetProgressSection.classList.add("hidden");
  budgetSublineEl.textContent = "No budget set";
  showToast("Budget cleared.", "info");
});

/**
 * Escapes a CSV field: doubles quotes, and prefixes a leading =, +, - or @
 * with an apostrophe so spreadsheet software treats it as text rather than a
 * formula.
 * @param {unknown} value
 * @returns {string}
 */
function csvField(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Export the currently displayed expenses to a CSV file.
 * Downloads using a temporary <a> element, revoking the blob URL afterwards.
 */
exportBtn.addEventListener("click", () => {
  if (!currentData || !Array.isArray(currentData.expenses) || currentData.expenses.length === 0) {
    showToast("No data to export.", "info");
    return;
  }

  const headers = ["Date", "Category", "Amount (EUR)", "Note"];
  const rows = currentData.expenses.map((e) => [
    e.date,
    e.category,
    (Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0).toFixed(2),
    e.note || "",
  ]);

  // CRLF line endings and a UTF-8 BOM keep Excel happy with the € column.
  const csv =
    "\uFEFF" + // UTF-8 BOM
    [headers, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pocketbudget_${monthFilterEl.value || "all"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url); // release the blob instead of leaking it

  showToast("Exported to CSV!", "success");
});

// ── Delete ─────────────────────────────────────────────────────

/**
 * Sends a DELETE request to remove a single expense.
 * @param {string} id - The UUID of the expense to delete
 * @param {HTMLButtonElement} button - The clicked button, disabled while busy
 */
async function deleteExpense(id, button) {
  if (!id) return;
  if (!window.confirm("Delete this expense? This cannot be undone.")) return;

  button.disabled = true;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/expenses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      throw new Error(
        await errorMessageFrom(response, "Could not delete expense"),
      );
    }

    showToast("Expense deleted.", "info");
    await loadExpenses();
  } catch (error) {
    console.error("Delete failed:", error);
    showToast(error.message || "Could not delete expense.", "error");
    button.disabled = false;
  }
}

/** Delegated click handling for every Delete button in the table. */
expenseTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button.btn-danger");
  if (button) deleteExpense(button.dataset.id, button);
});

// ── Initialisation ─────────────────────────────────────────────

// Display today's date in the top bar
currentDateEl.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Pre-fill the date input with today's date
dateInputEl.valueAsDate = new Date();

// Restore saved budget value into the input field
if (monthlyBudget > 0) {
  budgetInputEl.value = String(monthlyBudget);
}

// Show a placeholder until the first response arrives
renderTableMessage("Loading expenses…");

// Kick off the initial data load
loadExpenses();
