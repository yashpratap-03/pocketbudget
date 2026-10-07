/**
 * Export controller: downloads the expenses currently on screen as CSV.
 *
 * It reuses the last API response from state instead of fetching again, so
 * the file always matches what the user sees (including the month filter).
 */

import { dom } from "../dom.js";
import { state } from "../state.js";
import { buildExpensesCsv } from "../utils/csv.js";
import { downloadText } from "../ui/download.js";
import { showToast } from "../ui/toast.js";

/** "Export CSV" button handler. */
export function exportCsv() {
  const expenses = state.currentData?.expenses;
  if (!Array.isArray(expenses) || expenses.length === 0) {
    showToast("No data to export.", "info");
    return;
  }

  const filename = `pocketbudget_${dom.monthFilter.value || "all"}.csv`;
  downloadText(buildExpensesCsv(expenses), filename, "text/csv;charset=utf-8");
  showToast("Exported to CSV!", "success");
}
