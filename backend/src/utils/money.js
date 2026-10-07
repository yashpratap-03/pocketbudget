/**
 * Money helpers shared by validation and the expense service.
 */

"use strict";

/**
 * Rounds to two decimals without floating-point drift (1.005 → 1.01).
 * @param {number} value
 * @returns {number}
 */
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { roundMoney };
