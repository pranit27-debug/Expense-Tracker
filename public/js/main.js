import * as api from './api.js';
import * as ui from './ui.js';
import { initForm } from './components/form.js';
import { initList } from './components/list.js';

// Element references
const form = ui.q('#expense-form');
const amountInput = ui.q('#amount');
const categoryInput = ui.q('#category');
const descriptionInput = ui.q('#description');
const dateInput = ui.q('#date');
const submitBtn = ui.q('#submit');
const formStatus = ui.q('#form-status');
const errorEl = ui.q('#error');
const loadingEl = ui.q('#loading');

const tableBody = ui.q('#expenses-table tbody');
const filterCategory = ui.q('#filter-category');
const sortSelect = ui.q('#sort');
const totalEl = ui.q('#total');
const summaryEl = ui.q('#summary');

let formComp;
const list = initList({ onEdit: (item) => { console.log('onEdit received', item); if (formComp && typeof formComp.setEdit === 'function') formComp.setEdit(item); } });
formComp = initForm({ onSaved: () => { console.log('onSaved callback - refreshing list'); list && list.refresh(); } });

async function flushPendingAndRefresh() {
  const pending = api.loadPending();
  if (pending.length) {
    const formStatus = ui.q('#form-status');
    if (formStatus) formStatus.textContent = `Resending ${pending.length} pending...`;
    for (const p of pending.slice()) {
      try {
        await api.postExpense(p.body);
        const cur = api.loadPending().filter(x => x.client_id !== p.client_id);
        api.savePending(cur);
      } catch (err) {
        console.warn('Pending send failed', err);
      }
    }
    if (formStatus) formStatus.textContent = '';
  }
  await list.refresh();
}

(async function init(){
  dateInput.value = new Date().toISOString().slice(0,10);
  await flushPendingAndRefresh();
})();
