/**
 * Every DOM element the app uses, looked up once. If an id in index.html
 * changes, this is the only file to update.
 */

const byId = (id) => document.getElementById(id);

export const dom = {
  // Add-expense form
  expenseForm: byId("expenseForm"),
  submitBtn: byId("submitBtn"),
  amountInput: byId("amount"),
  categoryInput: byId("category"),
  dateInput: byId("date"),
  noteInput: byId("note"),

  // Stat cards
  totalAmount: byId("totalAmount"),
  expenseCount: byId("expenseCount"),
  avgAmount: byId("avgAmount"),
  topCategory: byId("topCategory"),
  topCategoryAmt: byId("topCategoryAmt"),
  budgetSubline: byId("budgetSubline"),

  // Chart and filter
  categoryChart: byId("categoryChart"),
  monthFilter: byId("monthFilter"),
  clearFilterBtn: byId("clearFilter"),

  // Table
  expenseTableBody: byId("expenseTableBody"),
  filteredNote: byId("filteredNote"),

  // Budget
  budgetInput: byId("budgetInput"),
  setBudgetBtn: byId("setBudgetBtn"),
  clearBudgetBtn: byId("clearBudgetBtn"),
  budgetProgressSection: byId("budgetProgressSection"),
  budgetProgressBar: byId("budgetProgressBar"),
  budgetProgressLabel: byId("budgetProgressLabel"),
  budgetWarning: byId("budgetWarning"),

  // Misc
  exportBtn: byId("exportBtn"),
  currentDate: byId("currentDate"),
  toastContainer: byId("toast-container"),
};
