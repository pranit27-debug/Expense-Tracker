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
  const url = '/expenses' + (q.toString() ? `?${q.toString()}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}
