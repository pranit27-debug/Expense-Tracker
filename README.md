# Expense Tracker (Minimal)

This is a small full-stack personal expense tracker built for the assignment.

Stack
- Backend: Node.js + Express
- DB: SQLite (via better-sqlite3)
- Frontend: static HTML + vanilla JS

Design notes
- Amounts are stored as integers (paise) to avoid floating point rounding: amount * 100.
- Idempotency: clients include a generated `client_id` with POST /expenses. The server stores `client_id` unique in the `expenses` table and returns the existing expense if the same `client_id` is submitted again. The frontend saves pending submissions in localStorage and will retry them on page load to survive refreshes and network failures.
- Persistence: SQLite is used because it's lightweight, server-local, transactional, and requires no external services for this exercise.

Additional notes
- Server-side validation: the API now rejects non-positive amounts and invalid dates to avoid bad data.
- API returns `amount` as a numeric value in rupees (e.g. `123.45`) and also exposes `amount_paise` (integer paise) for exact calculations.

Running locally

1. Install dependencies

```powershell
cd c:\Users\vikra\projects\expense-tracker
npm install
```

2. Start the server

```powershell
npm start
```

3. Open http://localhost:3000 in your browser.

What I implemented
- POST /expenses: create expense, idempotent when `client_id` provided.
- GET /expenses: list expenses; supports `category` filter and `sort=date_desc` (default newest first).
- Frontend: Add expense form, list, filter by category, sort by date (newest first), and total for visible expenses.
- Handles retries and refresh: pending submissions are saved client-side and retried automatically.

Trade-offs and next steps
- No authentication — client_id approach is simple but not sufficient for multi-user scenarios.
- Validation is minimal (frontend prevents negative amounts and requires date/category). Server-side validation is basic.
- Would add tests and small CI, and nicer UX/error states if this were extended.
