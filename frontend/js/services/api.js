/**
 * API client: the only module that talks to the backend.
 * Every function returns parsed JSON or throws an Error with a readable message.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../config.js";

/**
 * fetch with a timeout, so a dead server shows an error instead of hanging.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal });
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
 * Reads the { error } message from a failed response, with a fallback when
 * the body is not JSON.
 * @param {Response} response
 * @param {string} fallback
 */
async function errorMessageFrom(response, fallback) {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* body was not JSON */
  }
  return `${fallback} (HTTP ${response.status})`;
}

/**
 * GET /expenses, optionally filtered by month (YYYY-MM).
 * @param {string} [month]
 * @returns {Promise<{ count:number, totalAmount:number, totalsByCategory:Object, expenses:Array }>}
 */
export async function fetchExpenses(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  const response = await request(`/expenses${query}`);
  if (!response.ok) throw new Error(await errorMessageFrom(response, "Could not load expenses"));
  return response.json();
}

/**
 * POST /expenses
 * @param {{ amount:number, category:string, date:string, note:string }} payload
 */
export async function createExpense(payload) {
  const response = await request("/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await errorMessageFrom(response, "Failed to add expense"));
  return response.json();
}

/**
 * DELETE /expenses/:id
 * @param {string} id
 */
export async function deleteExpense(id) {
  const response = await request(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await errorMessageFrom(response, "Could not delete expense"));
  return response.json();
}
