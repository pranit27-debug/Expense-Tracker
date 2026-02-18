import * as api from '../api.js';
import * as ui from '../ui.js';

export function initForm({ onSaved } = {}) {
  const form = ui.q('#expense-form');
  const amountInput = ui.q('#amount');
  const categoryInput = ui.q('#category');
  const descriptionInput = ui.q('#description');
  const dateInput = ui.q('#date');
  const submitBtn = ui.q('#submit');
  const formStatus = ui.q('#form-status');
  const errorEl = ui.q('#error');

  async function handleSubmit(ev) {
    ev.preventDefault();
    ui.showError(errorEl, '');
    const amount = Number(amountInput.value);
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    if (!date) { ui.showError(errorEl, 'Date is required'); return; }
    if (!category) { ui.showError(errorEl, 'Category is required'); return; }
    if (!amount || amount <= 0) { ui.showError(errorEl, 'Amount must be greater than 0'); return; }

    submitBtn.disabled = true;
    formStatus.textContent = 'Submitting...';

    const client_id = ui.uuidv4();
    const body = { amount, category, description, date, client_id };

    const pending = api.loadPending();
    pending.push({ client_id, body });
    api.savePending(pending);

    try {
      await api.postExpense(body);
      const cur = api.loadPending().filter(x => x.client_id !== client_id);
      api.savePending(cur);
      formStatus.textContent = 'Saved.';
      // Use explicit clearing instead of form.reset() to avoid collisions
      clearForm();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error(err);
      ui.showError(errorEl, 'Failed to save — will retry automatically. ' + (err.message || ''));
    } finally {
      submitBtn.disabled = false;
      setTimeout(()=>{ formStatus.textContent = ''; }, 2500);
    }
  }

  form.addEventListener('submit', handleSubmit);

  function clearForm() {
    try {
      amountInput.value = '';
      categoryInput.value = '';
      descriptionInput.value = '';
      dateInput.value = new Date().toISOString().slice(0,10);
    } catch (e) { /* ignore */ }
  }

  const resetBtn = ui.q('#reset');
  if (resetBtn) resetBtn.addEventListener('click', () => { clearForm(); ui.showError(errorEl, ''); formStatus.textContent = ''; });

  return {
    destroy() {
      form.removeEventListener('submit', handleSubmit);
    }
  };
}
