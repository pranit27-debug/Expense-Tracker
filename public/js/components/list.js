import * as api from '../api.js';
import * as ui from '../ui.js';

export function initList({ onEdit } = {}) {
  const loadingEl = ui.q('#loading');
  const tableBody = ui.q('#expenses-table tbody');
  const filterCategory = ui.q('#filter-category');
  const sortSelect = ui.q('#sort');
  const totalEl = ui.q('#total');
  const summaryEl = ui.q('#summary');
  const errorEl = ui.q('#error');

  async function loadAndRender() {
    ui.setLoading(loadingEl, true);
    ui.showError(errorEl, '');
    try {
      // Fetch full payload (no pagination) then apply sort locally and paginate
      console.log('Fetching full expense payload for global sort', { sort: sortSelect.value, category: filterCategory.value });
      const fullResp = await api.fetchExpenses({ category: filterCategory.value });
      const allItems = Array.isArray(fullResp) ? fullResp : (fullResp.items || []);
      console.log('Full payload size', allItems.length);

      // Apply client-side sorting across the full payload
      const sortMode = sortSelect.value;
      function sortItems(arr, mode) {
        const copy = Array.from(arr);
        switch (mode) {
          case 'date_asc': return copy.sort((a,b)=> new Date(a.date) - new Date(b.date));
          case 'date_desc': return copy.sort((a,b)=> new Date(b.date) - new Date(a.date));
          case 'amount_asc': return copy.sort((a,b)=> Number(a.amount) - Number(b.amount));
          case 'amount_desc': return copy.sort((a,b)=> Number(b.amount) - Number(a.amount));
          case 'category_asc': return copy.sort((a,b)=> String(a.category||'').localeCompare(String(b.category||''), undefined, {sensitivity:'base'}));
          case 'category_desc': return copy.sort((a,b)=> String(b.category||'').localeCompare(String(a.category||''), undefined, {sensitivity:'base'}));
          default: return copy;
        }
      }

      const sorted = sortItems(allItems, sortMode);

      // Paginate locally
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const start = (page - 1) * perPage;
      const pageItems = sorted.slice(start, start + perPage);

      ui.renderTable(tableBody, pageItems);
      ui.populateFilterOptions(filterCategory, sorted);
      ui.renderTotal(totalEl, pageItems);
      ui.renderSummary(summaryEl, sorted);

      // update pagination UI
      const pageInfo = ui.q('#page-info');
      if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
      // enable/disable nav
      if (prevBtn) prevBtn.disabled = page <= 1;
      if (nextBtn) nextBtn.disabled = page >= totalPages;
    } catch (err) {
      ui.showError(errorEl, 'Failed to load expenses. ' + (err.message || ''));
    } finally {
      ui.setLoading(loadingEl, false);
    }
  }

  // pagination state
  let page = 1;
  const perPage = 5;

  const prevBtn = ui.q('#prev-page');
  const nextBtn = ui.q('#next-page');
  if (prevBtn) prevBtn.addEventListener('click', () => { if (page>1) { page--; loadAndRender(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { page++; loadAndRender(); });

  // click handlers for edit/delete (table rows)
  if (tableBody) tableBody.addEventListener('click', async (ev) => {
    let el = ev.target;
    if (el && el.nodeType === 3) el = el.parentNode; // text node -> element
    const btn = el && typeof el.closest === 'function' ? el.closest('button[data-id]') : null;
    if (!btn) return;
    const id = btn.getAttribute('data-id') || (btn.closest('tr') && btn.closest('tr').dataset.id);
    console.log('Clicked button', btn.className, 'id=', id);
    if (!id) return;
    if (btn.classList.contains('btn-delete')) {
      if (!confirm('Delete this expense?')) return;
      ui.setLoading(loadingEl, true);
      try {
        await api.deleteExpense(id);
        await loadAndRender();
      } catch (err) {
        ui.showError(errorEl, 'Delete failed. ' + (err.message || ''));
      } finally { ui.setLoading(loadingEl, false); }
    } else if (btn.classList.contains('btn-edit')) {
      // find the item; fetch fresh from server to get latest
      ui.setLoading(loadingEl, true);
      try {
        const resp = await api.fetchExpenses({ page: 1, per_page: 1000 });
        const items = Array.isArray(resp) ? resp : (resp.items || []);
        const item = items.find(i => i.id === id);
        if (item && typeof onEdit === 'function') onEdit(item);
      } catch (err) {
        console.error('edit fetch error', err);
        ui.showError(errorEl, 'Failed to fetch item for edit. ' + (err.message || ''));
      } finally { ui.setLoading(loadingEl, false); }
    }
  });

  filterCategory.addEventListener('change', loadAndRender);
  sortSelect.addEventListener('change', () => { console.log('Sort changed:', sortSelect.value); page = 1; loadAndRender(); });
  filterCategory.addEventListener('change', () => { page = 1; loadAndRender(); });

  return {
    refresh: loadAndRender
  };
}
