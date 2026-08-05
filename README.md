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

- **Node.js** (≥ 18.13) – runtime
- **Express 5** – REST API framework
- **CORS** – cross-origin resource sharing middleware
- **JSON file** (`backend/data/expenses.json`) – lightweight persistence

### Tooling

- **Nodemon** – auto-restart on file change during development
- **node:test** – built-in test runner (no extra dependencies)

---

## Project Structure

```
pocketbudget/
├── backend/
│   ├── data/
│   │   └── expenses.json      # Persistent data store
│   ├── test/
│   │   └── api.test.js        # Automated API test suite (47 tests)
│   ├── server.js              # Express app, validation & API routes
│   └── package.json
├── frontend/
│   ├── index.html             # App shell & markup
│   ├── style.css              # All styles (design tokens, layout, components)
│   └── app.js                 # Fetch logic, rendering, event handlers
├── LICENSE
├── package.json               # Convenience scripts for the whole project
└── README.md
```

---

## How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) version 18.13 or higher
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Quick start (from the project root)

```bash
npm install        # installs the backend dependencies
npm start          # starts the server on http://localhost:3001
```

Then open **http://localhost:3001** in your browser. The Express server serves
both the API and the frontend, so no second server or file-opening step is
needed.

For development with auto-reload:

```bash
npm run dev
```

To use a different port:

```bash
PORT=3002 npm start          # macOS / Linux
set PORT=3002 && npm start   # Windows (cmd)
```

### Verifying the backend

Open `http://localhost:3001/health` — you should see:

```json
{ "status": "ok", "message": "PocketBudget backend is running" }
```

### Opening the frontend directly from disk (optional)

The app also works if you open `frontend/index.html` straight from the file
system. In that case it falls back to talking to `http://localhost:3001`, so the
backend must be running. Serving it from the backend (above) is recommended.

---

## API Endpoints

| Method | Endpoint          | Description                                                           |
| ------ | ----------------- | --------------------------------------------------------------------- |
| GET    | `/health`         | Server health check                                                   |
| GET    | `/api/categories` | The list of accepted categories                                       |
| GET    | `/expenses`       | Get all expenses (supports `?month=YYYY-MM` and `?category=` filters) |
| POST   | `/expenses`       | Add a new expense                                                     |
| DELETE | `/expenses/:id`   | Delete an expense by UUID                                             |

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
  "totalAmount": 47.8,
  "totalsByCategory": { "Food": 25.5, "Transport": 22.3 },
  "expenses": [ ... ]
}
```

### Validation rules

Every field is validated on the server, so the API cannot be corrupted by a
malformed request even if the browser form is bypassed. Invalid requests get
`400` with a JSON `{ "error": "..." }` message and nothing is written to disk.

| Field      | Rule                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| `amount`   | Required. Finite number (or numeric string), `> 0` and `≤ 1,000,000`; rounded to 2 dp    |
| `category` | Required. One of Food, Transport, Housing, Entertainment, Health, Shopping, Education, Other (case-insensitive) |
| `date`     | Required. `YYYY-MM-DD`, a real calendar date, year between 1970 and 2100                |
| `note`     | Optional. Max 200 characters; control characters stripped                               |
| `?month=`  | Optional filter. Must be `YYYY-MM` with a month of 01–12                                |

### Error responses

| Status | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| `400`  | Invalid field, malformed JSON body, or bad query parameter      |
| `404`  | Unknown route, or `DELETE` of an id that does not exist         |
| `413`  | Request body larger than 100 kB                                 |
| `500`  | The data file is unreadable or could not be saved               |

---

## Robustness & Security Notes

These are the guarantees the implementation makes, each covered by the test
suite:

- **No stored-markup execution.** Every value from the API is written to the DOM
  with `textContent`; the frontend contains no `innerHTML` sink and no inline
  event handlers, so text saved in a note or category can never run as script.
- **No silent data loss.** If `expenses.json` is corrupt or is not a JSON array,
  the API reports a `500` and leaves the file untouched, rather than reading it
  as "no expenses" and then overwriting it on the next save.
- **Atomic writes.** Saves go to a temporary file that is then renamed over the
  target, so a crash mid-write cannot leave a truncated data file.
- **Self-healing storage.** A missing data directory or data file is recreated
  automatically on startup and on write.
- **Tolerant reads.** A hand-edited record with a missing or non-numeric field
  cannot crash a request or poison the totals.
- **No stack-trace leaks.** Unexpected errors are logged server-side and
  returned as a generic JSON `500`.
- **Double-submit protection.** The Add button is disabled while a request is in
  flight, and requests time out after 8 seconds instead of hanging.
- **CSV-injection protection.** Exported fields beginning with `=`, `+`, `-` or
  `@` are prefixed so spreadsheet software treats them as text, not formulas.

---

## Running Tests

The backend has an automated test suite using Node's built-in test runner — no
extra dependencies required. Tests run against a temporary data file, so your
real `expenses.json` is never modified.

```bash
npm test           # from the project root
```

Expected output ends with:

```
# tests 47
# pass 47
# fail 0
```

The suite covers: health and 404 handling, expense creation, amount/category/
date/note validation (including every invalid case listed above), month and
category filtering, totals and rounding, deletion, and data-file resilience
(corrupt file, wrong shape, empty file, missing file, missing directory,
hand-edited bad records, temp-file cleanup).

### Manual test cases (UI)

| #     | Action                                  | Expected Result                                  |
| ----- | --------------------------------------- | ------------------------------------------------ |
| TC-01 | Submit form with valid data             | Expense appears in table; toast "Expense added!" |
| TC-02 | Submit form with empty amount           | Submit blocked; validation message shown         |
| TC-03 | Submit form with no category selected   | Submit blocked; validation message shown         |
| TC-04 | Click Delete on an entry → confirm      | Entry removed; count decreases                   |
| TC-05 | Click Delete → cancel in confirm dialog | Entry NOT removed                                |
| TC-06 | Set a monthly budget of €100            | Progress bar appears                             |
| TC-07 | Add expenses exceeding the budget       | Bar turns red; "Over budget!" warning shown      |
| TC-08 | Click Export CSV with data present      | `.csv` file downloaded                           |
| TC-09 | Select a month filter                   | Only that month's entries shown                  |
| TC-10 | Resize browser to < 768px               | Layout stacks vertically; all content readable   |
| TC-11 | Start backend, load page, stop backend  | Error toast and message row shown; no crash      |
| TC-12 | Double-click Add Expense quickly        | Only one expense is created                      |
| TC-13 | Enter a negative amount and submit      | Rejected with a clear message                    |

---

## Author

**Yash Pratap Singh** — Matriculation No. 92017635  
IU Internationale Hochschule — DLBCSPJWD01

## License

Released under the [MIT License](LICENSE).
