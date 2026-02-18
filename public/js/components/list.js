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
      const resp = await api.fetchExpenses({ category: filterCategory.value, sort: sortSelect.value, page: page, per_page: perPage });
      const items = resp.items || [];
      const total = resp.total || (Array.isArray(items) ? items.length : 0);
      ui.renderTable(tableBody, items);
      ui.populateFilterOptions(filterCategory, items);
      ui.renderTotal(totalEl, items);
      // fetch full set (no paging) to build a complete category summary
      try {
        const fullResp = await api.fetchExpenses({ category: filterCategory.value, sort: sortSelect.value });
        const allItems = Array.isArray(fullResp) ? fullResp : (fullResp.items || []);
        ui.renderSummary(summaryEl, allItems);
      } catch (e) {
        // fallback to page items
        ui.renderSummary(summaryEl, items);
      }
      // update pagination UI
      const pageInfo = ui.q('#page-info');
      const totalPages = Math.max(1, Math.ceil((resp.total || total) / perPage));
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
    console.debug('Clicked button', btn.className, 'id=', id);
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
  sortSelect.addEventListener('change', () => { page = 1; loadAndRender(); });
  filterCategory.addEventListener('change', () => { page = 1; loadAndRender(); });

  return {
    refresh: loadAndRender
  };
}
