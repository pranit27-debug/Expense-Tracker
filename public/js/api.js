// Lightweight API helper module
export const PENDING_KEY = 'expense_pending_v1';

export function loadPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return []; }
}

export function savePending(arr) { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }

export async function postExpense(payload) {
  const res = await fetch('/expenses', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || res.statusText || 'Server error');
  }
  return res.json();
}

export async function fetchExpenses(params = {}) {
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.sort) q.set('sort', params.sort);
  if (params.page) q.set('page', params.page);
  if (params.per_page) q.set('per_page', params.per_page);
  const url = '/expenses' + (q.toString() ? `?${q.toString()}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  const data = await res.json();
  // If server returns paged object, pass it through
  if (data && typeof data === 'object' && !Array.isArray(data) && data.items) {
    return data;
  }
  // Server returned an array; perform client-side pagination if requested
  const all = Array.isArray(data) ? data : [];
  const total = all.length;
  const page = params.page ? Number(params.page) : 1;
  const perPage = params.per_page ? Number(params.per_page) : total || 1;
  const start = (page - 1) * perPage;
  const items = all.slice(start, start + perPage);
  return { items, total, page, per_page: perPage };
}

export async function putExpense(id, payload) {
  const res = await fetch(`/expenses/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || res.statusText || 'Failed to update');
  }
  return res.json();
}

export async function deleteExpense(id) {
  const res = await fetch(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || res.statusText || 'Failed to delete');
  }
  return true;
}
