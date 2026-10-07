/**
 * Toast notifications shown at the bottom-right of the screen.
 */

import { dom } from "../dom.js";

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=3000] milliseconds before it disappears
 */
export function showToast(message, type = "info", duration = 3000) {
  if (!dom.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.35s ease forwards";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
