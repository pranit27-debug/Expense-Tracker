// UI helpers for rendering and small utilities
export function q(sel, el = document) { return el.querySelector(sel); }
export function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export function formatRupee(n) { return `₹${Number(n).toFixed(2)}`; }
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function setLoading(loadingEl, on) {
  if (!loadingEl) return;
  // Use the DOM hidden property which is less fragile than toggling classes
  try { loadingEl.hidden = !on; } catch (e) { if (on) loadingEl.classList.remove('hidden'); else loadingEl.classList.add('hidden'); }
}

export function showError(errorEl, msg) {
  if (!errorEl) return;
  // Use the DOM hidden property for reliability
  if (!msg) { try { errorEl.hidden = true; } catch (e) { errorEl.classList.add('hidden'); } errorEl.textContent = ''; }
  else { errorEl.textContent = msg; try { errorEl.hidden = false; } catch (e) { errorEl.classList.remove('hidden'); } }
}

export function renderTable(tableBody, items) {
  if (!tableBody) return;
  tableBody.innerHTML = items.map(row => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.description || '')}</td>
      <td class="right">${formatRupee(row.amount)}</td>
    </tr>
  `).join('');
}

export function renderTotal(totalEl, items) {
  if (!totalEl) return;
  const total = items.reduce((s,i) => s + Number(i.amount), 0);
  totalEl.textContent = formatRupee(total);
}

export function renderSummary(summaryEl, items) {
  if (!summaryEl) return;
  const map = {};
  for (const it of items) map[it.category] = (map[it.category] || 0) + Number(it.amount);
  const rows = Object.keys(map).sort().map(k => `<li>${escapeHtml(k)}: ${formatRupee(map[k])}</li>`);
  summaryEl.innerHTML = rows.join('') || '<li>No expenses</li>';
}

export function populateFilterOptions(filterCategoryEl, items) {
  if (!filterCategoryEl) return;
  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const current = filterCategoryEl.value;
  filterCategoryEl.innerHTML = '<option value="">All</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (current) filterCategoryEl.value = current;
}
