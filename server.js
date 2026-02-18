const express = require('express');
const path = require('path');
const uuid = require('uuid');
const db = require('./db');

const app = express();
app.use(express.json());

// Helpers
function toISO(d) {
  return new Date(d).toISOString();
}

// POST /expenses
// Body: { amount, category, description, date, client_id? }
app.post('/expenses', (req, res) => {
  try {
    const { amount, category, description = '', date, client_id } = req.body;
    if (amount == null || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (!category) return res.status(400).json({ error: 'Missing category' });
    if (!date) return res.status(400).json({ error: 'Missing date' });
    // basic date validation
    const d = new Date(date);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date' });

    // store amounts as integer paise (₹ * 100)
    const paise = Math.round(Number(amount) * 100);
    const created_at = new Date().toISOString();

    // If client_id provided, check for existing (idempotency)
    if (client_id) {
      const existing = db.prepare('SELECT * FROM expenses WHERE client_id = ?').get(client_id);
      if (existing) {
        // return existing
        return res.status(200).json(mapRow(existing));
      }
    }

    const id = uuid.v4();
    const stmt = db.prepare(
      'INSERT INTO expenses (id, amount, category, description, date, created_at, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, paise, category, description, date, created_at, client_id || null);

    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    res.status(201).json(mapRow(row));
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // client_id unique constraint race: return existing
      const clientId = req.body && req.body.client_id;
      if (clientId) {
        const existing = db.prepare('SELECT * FROM expenses WHERE client_id = ?').get(clientId);
        if (existing) return res.status(200).json(mapRow(existing));
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /expenses?category=food&sort=date_desc=1
app.get('/expenses', (req, res) => {
  try {
    const { category, sort, page, per_page } = req.query;
    const params = [];
    let where = '';
    if (category) {
      where = 'WHERE category = ?';
      params.push(category);
    }

    // Determine ORDER BY clause
    let orderBy = 'ORDER BY date DESC, created_at DESC';
    switch (sort) {
      case 'date_asc': orderBy = 'ORDER BY date ASC, created_at ASC'; break;
      case 'date_desc': orderBy = 'ORDER BY date DESC, created_at DESC'; break;
      case 'amount_asc': orderBy = 'ORDER BY CAST(amount AS INTEGER) ASC, date DESC'; break;
      case 'amount_desc': orderBy = 'ORDER BY CAST(amount AS INTEGER) DESC, date DESC'; break;
      case 'category_asc': orderBy = "ORDER BY category COLLATE NOCASE ASC, date DESC"; break;
      case 'category_desc': orderBy = "ORDER BY category COLLATE NOCASE DESC, date DESC"; break;
      default: orderBy = 'ORDER BY date DESC, created_at DESC';
    }

    // Pagination (server-side)
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    // If per_page is not provided, default to 0 (no pagination)
    const perPage = typeof per_page !== 'undefined' && per_page !== ''
      ? Math.max(1, Math.min(100, parseInt(per_page, 10) || 1))
      : 0;

    // Count total matching rows
    const countSql = `SELECT COUNT(*) as cnt FROM expenses ${where}`;
    const countRow = db.prepare(countSql).get(...params);
    const total = countRow ? countRow.cnt : 0;

    let sql = `SELECT * FROM expenses ${where} ${orderBy}`;
    console.log('GET /expenses', { sort, page: pageNum, per_page: perPage, sql });
    if (perPage > 0) {
      const offset = (pageNum - 1) * perPage;
      sql += ' LIMIT ' + perPage + ' OFFSET ' + offset;
    }

    const rows = db.prepare(sql).all(...params);
    // log the first few raw amounts to help debug ordering
    try { console.log('GET /expenses -> raw amounts (first rows):', rows.slice(0,10).map(r=>r.amount)); } catch(e){/*ignore*/}
    const items = rows.map(mapRow);
    if (perPage > 0) {
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      return res.json({ items, total, page: pageNum, per_page: perPage, total_pages: totalPages });
    }

    // No pagination requested: return full sorted items
    return res.json(items);
  } catch (err) {
    console.error('GET /expenses error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /expenses/:id  -- update an expense
app.put('/expenses/:id', (req, res) => {
  console.log('PUT /expenses/' + req.params.id);
  try {
    const id = req.params.id;
    const { amount, category, description = '', date } = req.body;
    if (amount == null || isNaN(Number(amount))) return res.status(400).json({ error: 'Invalid amount' });
    if (Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (!category) return res.status(400).json({ error: 'Missing category' });
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const d = new Date(date);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date' });

    const paise = Math.round(Number(amount) * 100);
    const stmt = db.prepare('UPDATE expenses SET amount = ?, category = ?, description = ?, date = ? WHERE id = ?');
    const info = stmt.run(paise, category, description, date, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    res.json(mapRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /expenses/:id
app.delete('/expenses/:id', (req, res) => {
  try {
    const id = req.params.id;
    console.log('DELETE request for id', id);
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Serve static frontend (place after API routes to avoid accidental routing interference)
app.use(express.static(path.join(__dirname, 'public')));

function mapRow(r) {
  return {
    id: r.id,
    // amount returned as a number in rupees (avoid string serialization)
    amount: r.amount / 100,
    amount_paise: r.amount,
    category: r.category,
    description: r.description,
    date: r.date,
    created_at: r.created_at,
    client_id: r.client_id
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
