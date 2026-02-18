const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

function init() {
  // expenses: amount stored as integer paise (₹ * 100)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      client_id TEXT UNIQUE
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
  `);
}

init();

module.exports = db;
