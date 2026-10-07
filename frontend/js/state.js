/**
 * Application state shared between modules.
 *
 * Holds the monthly budget, the latest API response (used by the CSV export
 * without refetching) and a flag that blocks double submits.
 */

import { BUDGET_STORAGE_KEY } from "./config.js";
import { storageGet, storageSet, storageRemove } from "./services/storage.js";

export const state = {
  /** Monthly budget in euros; 0 means no budget is set. */
  monthlyBudget: 0,
  /** Last successful GET /expenses response, or null. */
  currentData: null,
  /** True while a POST is in flight. */
  isSubmitting: false,
};

/** Restores the saved budget from localStorage, if any. */
export function loadSavedBudget() {
  const saved = Number.parseFloat(storageGet(BUDGET_STORAGE_KEY) ?? "");
  state.monthlyBudget = Number.isFinite(saved) && saved > 0 ? saved : 0;
}

/** @param {number} amount */
export function saveBudget(amount) {
  state.monthlyBudget = amount;
  storageSet(BUDGET_STORAGE_KEY, String(amount));
}

export function clearSavedBudget() {
  state.monthlyBudget = 0;
  storageRemove(BUDGET_STORAGE_KEY);
}
