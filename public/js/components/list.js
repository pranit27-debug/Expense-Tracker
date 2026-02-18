import * as api from '../api.js';
import * as ui from '../ui.js';

export function initList() {
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
      const items = await api.fetchExpenses({ category: filterCategory.value, sort: sortSelect.value });
      ui.renderTable(tableBody, items);
      ui.populateFilterOptions(filterCategory, items);
      ui.renderTotal(totalEl, items);
      ui.renderSummary(summaryEl, items);
    } catch (err) {
      ui.showError(errorEl, 'Failed to load expenses. ' + (err.message || ''));
    } finally {
      ui.setLoading(loadingEl, false);
    }
  }

  filterCategory.addEventListener('change', loadAndRender);
  sortSelect.addEventListener('change', loadAndRender);

  return {
    refresh: loadAndRender
  };
}
