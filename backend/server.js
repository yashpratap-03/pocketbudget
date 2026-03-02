const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "data", "expenses.json");

// Helpers
function readExpenses() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeExpenses(expenses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2));
}

// Root
app.get("/", (req, res) => {
  res.send("PocketBudget backend is running ✅ Try /health or /expenses");
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "PocketBudget backend is running ✅" });
});
app.get("/", (req, res) => {
  res.send("PocketBudget backend is running ✅ Try /health");
});
/**
 * POST /expenses
 * Body: { amount, category, date, note }
 */
app.post("/expenses", (req, res) => {
  const { amount, category, date, note } = req.body;

  // Basic validation
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return res.status(400).json({ error: "amount must be a number" });
  }
  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "category is required" });
  }
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
  }

  const expenses = readExpenses();

  const newExpense = {
    id: crypto.randomUUID(),
    amount: Number(amount),
    category: category.trim(),
    date, // keep as string YYYY-MM-DD
    note: note ? String(note).trim() : "",
    createdAt: new Date().toISOString(),
  };

  expenses.push(newExpense);
  writeExpenses(expenses);

  res.status(201).json(newExpense);
});

/**
 * GET /expenses
 * Optional query params:
 *   month=YYYY-MM
 *   category=Food
 */
app.get("/expenses", (req, res) => {
  const { month, category } = req.query;
  let expenses = readExpenses();

  if (month) {
    expenses = expenses.filter((e) => e.date.startsWith(month));
  }
  if (category) {
    expenses = expenses.filter(
      (e) => e.category.toLowerCase() === String(category).toLowerCase()
    );
  }

  // Totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category totals
  const totalsByCategory = {};
  for (const e of expenses) {
    totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + e.amount;
  }

  res.json({
    count: expenses.length,
    totalAmount,
    totalsByCategory,
    expenses,
  });
});

/**
 * DELETE /expenses/:id  (optional but very useful)
 */
app.delete("/expenses/:id", (req, res) => {
  const { id } = req.params;
  const expenses = readExpenses();
  const newExpenses = expenses.filter((e) => e.id !== id);

  if (newExpenses.length === expenses.length) {
    return res.status(404).json({ error: "Expense not found" });
  }

  writeExpenses(newExpenses);
  res.json({ status: "deleted", id });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});