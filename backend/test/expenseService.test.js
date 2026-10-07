/**
 * Unit tests for src/services/expenseService.js.
 *
 * The service receives its store as a parameter, so these tests pass an
 * in-memory store instead of a real file. No server and no disk access.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createExpenseService,
  filterExpenses,
  summarise,
} = require("../src/services/expenseService");

/** A store that keeps expenses in memory. */
function memoryStore(initial = []) {
  let data = [...initial];
  return {
    readAll: () => [...data],
    writeAll: (expenses) => {
      data = [...expenses];
    },
    snapshot: () => data,
  };
}

const sample = [
  { id: "1", amount: 10, category: "Food", date: "2026-03-01" },
  { id: "2", amount: 20.1, category: "Food", date: "2026-03-15" },
  { id: "3", amount: 5, category: "Transport", date: "2026-04-02" },
];

test("summarise totals amounts and groups them by category", () => {
  const result = summarise(sample);
  assert.equal(result.count, 3);
  assert.equal(result.totalAmount, 35.1);
  assert.deepEqual(result.totalsByCategory, { Food: 30.1, Transport: 5 });
});

test("filterExpenses applies month and category filters together", () => {
  assert.equal(filterExpenses(sample, { month: "2026-03" }).length, 2);
  assert.equal(filterExpenses(sample, { category: "transport" }).length, 1);
  assert.equal(filterExpenses(sample, { month: "2026-03", category: "Transport" }).length, 0);
});

test("create assigns an id and timestamp and persists the expense", () => {
  const store = memoryStore();
  const service = createExpenseService(store);

  const created = service.create({
    amount: 4.5,
    category: "Food",
    date: "2026-03-20",
    note: "Tea",
  });

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.ok(Date.parse(created.createdAt));
  assert.equal(store.snapshot().length, 1);
});

test("remove deletes an existing expense and reports unknown ids", () => {
  const store = memoryStore(sample);
  const service = createExpenseService(store);

  assert.equal(service.remove("2"), true);
  assert.equal(store.snapshot().length, 2);
  assert.equal(service.remove("missing"), false);
  assert.equal(store.snapshot().length, 2);
});

test("list returns the filtered summary", () => {
  const service = createExpenseService(memoryStore(sample));
  const result = service.list({ month: "2026-04" });
  assert.equal(result.count, 1);
  assert.equal(result.totalAmount, 5);
});
