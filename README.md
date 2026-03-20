# PocketBudget

**PocketBudget** is a full-stack expense tracking web application built for the IU course **DLBCSPJWD01 – Project Java & Web Development**.

> Live demo: run locally following the instructions below.  
> GitHub: https://github.com/yashpratap-03/pocketbudget

---

## Features

| Feature             | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| Add Expense         | Log amount, category, date and optional note via a form         |
| Delete Expense      | Remove any entry instantly                                      |
| Expense Table       | View all entries sorted most-recent-first                       |
| Category Summary    | Horizontal bar chart showing spend per category with % of total |
| Monthly Filter      | Filter both the chart and table by any calendar month           |
| Monthly Budget      | Set a spending limit; live progress bar warns when over budget  |
| Statistics          | Total spent, transaction count, average per entry, top category |
| CSV Export          | Download the current view as a `.csv` file                      |
| Toast Notifications | Non-blocking feedback messages for all user actions             |
| Responsive Design   | Fully usable on desktop, tablet and mobile                      |

---

## Tech Stack

### Frontend

- **HTML5** – semantic markup
- **CSS3** – custom properties (design tokens), CSS Grid, Flexbox, animations
- **JavaScript (ES2022, vanilla)** – fetch API, DOM manipulation, localStorage

### Backend

- **Node.js** (≥ 18) – runtime
- **Express 5** – REST API framework
- **CORS** – cross-origin resource sharing middleware
- **JSON file** (`backend/data/expenses.json`) – lightweight persistence

### Tooling

- **Nodemon** – auto-restart on file change during development

---

## Project Structure

```
pocketbudget/
├── backend/
│   ├── data/
│   │   └── expenses.json      # Persistent data store
│   ├── server.js              # Express app & API routes
│   └── package.json
├── frontend/
│   ├── index.html             # App shell & markup
│   ├── style.css              # All styles (design tokens, layout, components)
│   └── app.js                 # Fetch logic, rendering, event handlers
└── README.md
```

---

## API Endpoints

| Method | Endpoint        | Description                                                           |
| ------ | --------------- | --------------------------------------------------------------------- |
| GET    | `/health`       | Server health check                                                   |
| GET    | `/expenses`     | Get all expenses (supports `?month=YYYY-MM` and `?category=` filters) |
| POST   | `/expenses`     | Add a new expense                                                     |
| DELETE | `/expenses/:id` | Delete an expense by UUID                                             |

### POST /expenses — Request Body

```json
{
  "amount": 15.5,
  "category": "Food",
  "date": "2026-03-20",
  "note": "Lunch"
}
```

### GET /expenses — Response

```json
{
  "count": 3,
  "totalAmount": 47.80,
  "totalsByCategory": { "Food": 25.50, "Transport": 22.30 },
  "expenses": [ ... ]
}
```

---

## How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) version 18 or higher
- A modern web browser (Chrome, Firefox, Edge)

### 1 — Start the backend

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001 with auto-reload
```

To verify: open `http://localhost:3001/health` — you should see `{ "status": "ok" }`.

### 2 — Open the frontend

Open `frontend/index.html` directly in your browser:

```bash
# macOS
open frontend/index.html

# Windows
start frontend/index.html

# Linux
xdg-open frontend/index.html
```

> **Note:** The frontend communicates with the backend at `http://localhost:3001`. Make sure the backend is running before opening the frontend.

---

## Running Tests

Manual test cases are documented below. Automated tests are planned for Phase 3.

| #     | Action                                  | Expected Result                                  |
| ----- | --------------------------------------- | ------------------------------------------------ |
| TC-01 | Submit form with valid data             | Expense appears in table; toast "Expense added!" |
| TC-02 | Submit form with empty amount           | Browser validation prevents submit               |
| TC-03 | Submit form with no category selected   | Browser validation prevents submit               |
| TC-04 | Click Delete on an entry → confirm      | Entry removed; count decreases                   |
| TC-05 | Click Delete → cancel in confirm dialog | Entry NOT removed                                |
| TC-06 | Set a monthly budget of €100            | Progress bar appears                             |
| TC-07 | Add expenses exceeding the budget       | Bar turns red; "Over budget!" warning shown      |
| TC-08 | Click Export CSV with data present      | `.csv` file downloaded                           |
| TC-09 | Select a month filter                   | Only that month's entries shown                  |
| TC-10 | Resize browser to < 768px               | Layout stacks vertically; all content readable   |
| TC-11 | Start backend, load page, stop backend  | Error toast shown instead of crash               |

---

## Author

**Yash Pratap Singh** — Matriculation No. 92017635  
IU Internationale Hochschule — DLBCSPJWD01
