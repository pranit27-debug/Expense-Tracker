// Minimal frontend app
(function(){
  const apiBase = '';

  // Utils
  function q(sel, el=document) { return el.querySelector(sel); }
  function formatRupee(n) { return `₹${Number(n).toFixed(2)}`; }
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Elements
  const form = q('#expense-form');
  const amountInput = q('#amount');
  const categoryInput = q('#category');
  const descriptionInput = q('#description');
  const dateInput = q('#date');
  const submitBtn = q('#submit');
  const formStatus = q('#form-status');
  const errorEl = q('#error');
  const loadingEl = q('#loading');

  const tableBody = q('#expenses-table tbody');
  const filterCategory = q('#filter-category');
  const sortSelect = q('#sort');
  const totalEl = q('#total');
  const summaryEl = q('#summary');

  // localStorage key for pending submissions
  const PENDING_KEY = 'expense_pending_v1';

  function loadPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch(e){ return []; } }
  function savePending(arr) { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }

  async function postExpense(payload) {
    const res = await fetch(apiBase + '/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(()=>null);
      const err = text || res.statusText || 'Server error';
      throw new Error(err);
    }
    return res.json();
  }

  // UI helpers
  function showError(msg) { if (!msg) { errorEl.classList.add('hidden'); errorEl.textContent = ''; } else { errorEl.textContent = msg; errorEl.classList.remove('hidden'); } }
  function setLoading(on) { if (on) { loadingEl.classList.remove('hidden'); } else { loadingEl.classList.add('hidden'); } }

  // Send pending requests on startup
  async function flushPending() {
    const pending = loadPending();
    if (!pending.length) return;
    formStatus.textContent = `Resending ${pending.length} pending...`;
    for (const p of pending.slice()) {
      try {
        await postExpense(p.body);
        const cur = loadPending().filter(x => x.client_id !== p.client_id);
        savePending(cur);
      } catch (err) {
        console.warn('Pending send failed', err);
      }
    }
    formStatus.textContent = '';
  }

  // Load and render with loading/error handling
  async function loadAndRender() {
    setLoading(true); showError('');
    try {
      const category = filterCategory.value;
      const sort = sortSelect.value;
      const q = new URLSearchParams();
      if (category) q.set('category', category);
      if (sort) q.set('sort', sort);
      const url = '/expenses' + (q.toString() ? `?${q.toString()}` : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load expenses');
      const data = await res.json();
      renderTable(data);
      populateFilterOptions(data);
      renderSummary(data);
    } catch (err) {
      showError('Failed to load expenses. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }

  function populateFilterOptions(items) {
    const categories = Array.from(new Set(items.map(i => i.category))).sort();
    const current = filterCategory.value;
    filterCategory.innerHTML = '<option value="">All</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (current) filterCategory.value = current;
  }

  function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderTable(items) {
    tableBody.innerHTML = items.map(row => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.description || '')}</td>
        <td class="right">${formatRupee(row.amount)}</td>
      </tr>
    `).join('');
    const total = items.reduce((s,i) => s + Number(i.amount), 0);
    totalEl.textContent = formatRupee(total);
  }

  function renderSummary(items) {
    const map = {};
    for (const it of items) {
      map[it.category] = (map[it.category] || 0) + Number(it.amount);
    }
    const rows = Object.keys(map).sort().map(k => `<li>${escapeHtml(k)}: ${formatRupee(map[k])}</li>`);
    summaryEl.innerHTML = rows.join('') || '<li>No expenses</li>';
  }

  // Form handling with stronger validation and robust pending save
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showError('');
    const amount = Number(amountInput.value);
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    if (!date) { showError('Date is required'); return; }
    if (!category) { showError('Category is required'); return; }
    if (!amount || amount <= 0) { showError('Amount must be greater than 0'); return; }

    // Prevent multiple clicks
    submitBtn.disabled = true;
    formStatus.textContent = 'Submitting...';

    const client_id = uuidv4();
    const body = { amount: amount, category, description, date, client_id };

    // Save pending before network to survive refresh
    const pending = loadPending();
    pending.push({ client_id, body });
    savePending(pending);

    try {
      await postExpense(body);
      const cur = loadPending().filter(x => x.client_id !== client_id);
      savePending(cur);
      formStatus.textContent = 'Saved.';
      form.reset();
      await loadAndRender();
    } catch (err) {
      console.error(err);
      showError('Failed to save — will retry automatically. ' + (err.message || ''));
    } finally {
      submitBtn.disabled = false;
      setTimeout(()=>{ formStatus.textContent = ''; }, 3000);
    }
  });

  // Controls
  filterCategory.addEventListener('change', loadAndRender);
  sortSelect.addEventListener('change', loadAndRender);

  // Init
  (async function init(){
    dateInput.value = new Date().toISOString().slice(0,10);
    await flushPending();
    await loadAndRender();
  })();

})();
