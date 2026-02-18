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
    <tr class="expense-row" data-id="${escapeHtml(row.id)}">
      <td class="col-date">${escapeHtml(row.date)}</td>
      <td class="col-category">${escapeHtml(row.category)}</td>
      <td class="col-desc">${escapeHtml(row.description || '')}</td>
      <td class="col-amount right">${formatRupee(row.amount)}</td>
      <td class="col-actions">
        <button class="btn btn-link btn-edit" data-id="${escapeHtml(row.id)}">Edit</button>
        <button class="btn btn-link btn-delete" data-id="${escapeHtml(row.id)}">Delete</button>
      </td>
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
  const entries = Object.keys(map).sort().map(k => ({ k, v: map[k] }));
  const limit = 5;
  const top = entries.slice(0, limit);
  const rows = top.map(e => `<li>${escapeHtml(e.k)}: ${formatRupee(e.v)}</li>`);
  summaryEl.innerHTML = rows.join('') || '<li>No expenses</li>';
  // remove existing view-all if present
  const existing = summaryEl.parentNode.querySelector('#view-all-categories');
  if (existing) existing.remove();
  if (entries.length > limit) {
    const btn = document.createElement('button');
    btn.id = 'view-all-categories';
    btn.className = 'btn btn-muted';
    btn.textContent = 'View all';
    btn.style.marginTop = '8px';
    btn.addEventListener('click', () => showCategoryModal(entries));
    summaryEl.parentNode.appendChild(btn);
  }
}

export function showCategoryModal(entries) {
  // entries: [{k, v}, ...] — show paginated list inside modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  const title = document.createElement('h3');
  title.textContent = 'All category summary';
  box.appendChild(title);
  const list = document.createElement('div');
  list.className = 'modal-list';
  box.appendChild(list);

  // pagination controls
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  const prev = document.createElement('button');
  prev.className = 'btn btn-muted';
  prev.textContent = 'Prev';
  const pageInfo = document.createElement('span');
  pageInfo.className = 'muted';
  pageInfo.style.margin = '0 8px';
  const next = document.createElement('button');
  next.className = 'btn btn-muted';
  next.textContent = 'Next';
  const close = document.createElement('button');
  close.className = 'btn btn-primary';
  close.textContent = 'Close';
  footer.appendChild(prev);
  footer.appendChild(pageInfo);
  footer.appendChild(next);
  footer.appendChild(close);
  box.appendChild(footer);

  let page = 1;
  const perPage = 5;
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function renderPage() {
    list.innerHTML = '';
    const start = (page - 1) * perPage;
    const slice = entries.slice(start, start + perPage);
    slice.forEach(e => {
      const item = document.createElement('div');
      item.className = 'modal-item';
      item.innerHTML = `<div class="modal-item-key">${escapeHtml(e.k)}</div><div class="modal-item-val">${formatRupee(e.v)}</div>`;
      list.appendChild(item);
    });
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prev.disabled = page <= 1;
    next.disabled = page >= totalPages;
  }

  prev.addEventListener('click', () => { if (page>1) { page--; renderPage(); } });
  next.addEventListener('click', () => { if (page<totalPages) { page++; renderPage(); } });
  close.addEventListener('click', () => { document.body.removeChild(overlay); });

  overlay.appendChild(box);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);

  renderPage();
}

export function populateFilterOptions(filterCategoryEl, items) {
  if (!filterCategoryEl) return;
  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const current = filterCategoryEl.value;
  filterCategoryEl.innerHTML = '<option value="">All</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (current) filterCategoryEl.value = current;
}
