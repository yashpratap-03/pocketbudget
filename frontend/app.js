const API_BASE_URL = "http://localhost:3001";

const expenseForm = document.getElementById("expenseForm");
const message = document.getElementById("message");
const totalAmountEl = document.getElementById("totalAmount");
const expenseCountEl = document.getElementById("expenseCount");
const categoryTotalsEl = document.getElementById("categoryTotals");
const expenseTableBody = document.getElementById("expenseTableBody");

async function loadExpenses() {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    const data = await response.json();

    totalAmountEl.textContent = `€${Number(data.totalAmount).toFixed(2)}`;
    expenseCountEl.textContent = data.count;

    categoryTotalsEl.innerHTML = "";
    Object.entries(data.totalsByCategory).forEach(([category, total]) => {
      const li = document.createElement("li");
      li.textContent = `${category}: €${Number(total).toFixed(2)}`;
      categoryTotalsEl.appendChild(li);
    });

    expenseTableBody.innerHTML = "";

    if (data.expenses.length === 0) {
      expenseTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:20px;">
            No expenses yet. Add your first one 👆
        </td>
        </tr>
      `;
      return;
    }
    data.expenses.forEach((expense) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(expense.date).toLocaleDateString()}</td>
        <td>${expense.category}</td>
        <td>€${Number(expense.amount).toFixed(2)}</td>
        <td>${expense.note || "-"}</td>
        <td><button onclick="deleteExpense('${expense.id}')">Delete</button></td>
      `;
      expenseTableBody.appendChild(row);
    });
  } catch (error) {
    message.textContent = "Could not load expenses.";
    console.error(error);
  }
}

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(expenseForm);
  const expense = {
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    note: formData.get("note"),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expense),
    });

    if (!response.ok) {
      throw new Error("Failed to add expense");
    }

    expenseForm.reset();
    message.textContent = "Expense added successfully.";
    loadExpenses();
  } catch (error) {
    message.textContent = "Error adding expense.";
    console.error(error);
  }
});

loadExpenses();
async function deleteExpense(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    loadExpenses();
  } catch (error) {
    console.error(error);
    alert("Error deleting expense");
  }
}
