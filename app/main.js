// Hearthly app wiring: state, persistence, routing and control handlers.
// The site is a small hash-routed app — #/ dashboard, #/ledger, #/budgets,
// #/goals, #/bills — and everything it shows is computed from the state
// below, which is kept in localStorage so a household's own edits survive
// a reload. Amounts are stored in US dollars; the header's currency
// selector only changes how they are displayed.
//
// window.__shotReady flips to true once a page is on screen, so a
// screenshot script knows when it may capture.

import { CATEGORIES, CURRENCIES, seedBills, seedGoals, seedHistory, seedTransactions } from './data.js';
import { billsView, budgetsView, dashboardView, goalsView, ledgerView, makeFormatter, missingView } from './views.js';

const STORE_KEY = 'hearthly-state-v1';

function freshState() {
  const budgets = {};
  for (const c of CATEGORIES) budgets[c.id] = c.budget;
  return {
    transactions: seedTransactions(),
    history: seedHistory(),
    bills: seedBills(),
    goals: seedGoals(),
    budgets,
    currency: 'USD',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.bills) || !Array.isArray(parsed.goals)) return freshState();
    return { ...freshState(), ...parsed };
  } catch {
    return freshState();
  }
}

const state = loadState();
const ui = { filter: 'all', search: '', editing: null };

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the site still works for
    // the session, it just cannot keep edits between visits.
  }
}
save();

const app = document.getElementById('app');
const currencySelect = document.getElementById('currency-select');

function fmt() {
  return makeFormatter(CURRENCIES[state.currency] || CURRENCIES.USD);
}

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/ledger')) return 'ledger';
  if (hash.startsWith('#/budgets')) return 'budgets';
  if (hash.startsWith('#/goals')) return 'goals';
  if (hash.startsWith('#/bills')) return 'bills';
  if (hash === '#/' || hash === '#' || hash === '') return 'dashboard';
  return 'missing';
}

function render() {
  window.__shotReady = false;
  const page = route();
  const f = fmt();
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  f.toDisplay = (usd) => Math.round(usd * cur.rate * 100) / 100;
  f.symbol = cur.symbol;
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === `#/${page === 'dashboard' ? '' : page}` || (page === 'dashboard' && a.getAttribute('href') === '#/'));
  });
  if (page === 'dashboard') {
    document.title = 'Hearthly — Household Budget';
    app.innerHTML = dashboardView(state, f);
  } else if (page === 'ledger') {
    document.title = 'Ledger | Hearthly';
    app.innerHTML = ledgerView(state, f, ui);
    wireLedger();
  } else if (page === 'budgets') {
    document.title = 'Budgets | Hearthly';
    app.innerHTML = budgetsView(state, f);
    wireBudgets();
  } else if (page === 'goals') {
    document.title = 'Savings goals | Hearthly';
    app.innerHTML = goalsView(state, f);
    wireGoals();
  } else if (page === 'bills') {
    document.title = 'Bills & subscriptions | Hearthly';
    app.innerHTML = billsView(state, f);
    wireBills();
  } else {
    document.title = 'Not found | Hearthly';
    app.innerHTML = missingView();
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function toUSD(displayAmount) {
  const rate = (CURRENCIES[state.currency] || CURRENCIES.USD).rate;
  return Math.round((displayAmount / rate) * 100) / 100;
}

function wireLedger() {
  const form = document.getElementById('entry-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const amountDisplay = Number(data.get('amount'));
    if (!Number.isFinite(amountDisplay) || amountDisplay <= 0) return;
    const signed = data.get('kind') === 'income' ? -toUSD(amountDisplay) : toUSD(amountDisplay);
    if (ui.editing) {
      const t = state.transactions.find((x) => x.id === ui.editing.id);
      if (t) {
        t.text = String(data.get('text')).trim();
        t.amount = signed;
        t.category = String(data.get('category'));
        t.date = String(data.get('date'));
      }
      ui.editing = null;
    } else {
      state.transactions.push({
        id: `entry-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        text: String(data.get('text')).trim(),
        amount: signed,
        category: String(data.get('category')),
        date: String(data.get('date')),
      });
    }
    save();
    render();
  });
  const cancel = document.getElementById('cancel-edit');
  if (cancel) cancel.addEventListener('click', () => { ui.editing = null; render(); });
  app.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.editing = state.transactions.find((x) => x.id === btn.getAttribute('data-edit')) || null;
      render();
    });
  });
  app.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-delete');
      state.transactions = state.transactions.filter((x) => x.id !== id);
      if (ui.editing && ui.editing.id === id) ui.editing = null;
      save();
      render();
    });
  });
  const filter = document.getElementById('filter-category');
  filter.addEventListener('change', () => { ui.filter = filter.value; render(); });
  const search = document.getElementById('filter-text');
  search.addEventListener('input', () => {
    ui.search = search.value;
    render();
    const again = document.getElementById('filter-text');
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
  });
}

function wireBudgets() {
  app.querySelectorAll('[data-budget-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const id = form.getAttribute('data-budget-form');
      const value = Number(new FormData(form).get('budget'));
      if (Number.isFinite(value) && value >= 0) {
        state.budgets[id] = toUSD(value);
        save();
        render();
      }
    });
  });
}

function wireGoals() {
  app.querySelectorAll('[data-goal-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const goal = state.goals.find((g) => g.id === form.getAttribute('data-goal-form'));
      const value = Number(new FormData(form).get('monthly'));
      if (goal && Number.isFinite(value) && value >= 0) {
        goal.monthly = toUSD(value);
        save();
        render();
      }
    });
  });
  app.querySelectorAll('[data-deposit-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const goal = state.goals.find((g) => g.id === form.getAttribute('data-deposit-form'));
      const value = Number(new FormData(form).get('deposit'));
      if (goal && Number.isFinite(value) && value > 0) {
        goal.saved = Math.round((goal.saved + toUSD(value)) * 100) / 100;
        save();
        render();
      }
    });
  });
  app.querySelectorAll('[data-delete-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.goals = state.goals.filter((g) => g.id !== btn.getAttribute('data-delete-goal'));
      save();
      render();
    });
  });
  const create = document.getElementById('goal-new');
  create.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(create);
    const target = Number(data.get('target'));
    if (!Number.isFinite(target) || target <= 0) return;
    state.goals.push({
      id: `goal-${Date.now()}`,
      name: String(data.get('name')).trim(),
      target: toUSD(target),
      saved: toUSD(Number(data.get('saved')) || 0),
      monthly: toUSD(Number(data.get('monthly')) || 0),
      note: 'A goal this household added for itself.',
    });
    save();
    render();
  });
}

function wireBills() {
  app.querySelectorAll('[data-autopay]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bill = state.bills.find((b) => b.id === btn.getAttribute('data-autopay'));
      if (bill) { bill.autopay = !bill.autopay; save(); render(); }
    });
  });
  app.querySelectorAll('[data-paid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bill = state.bills.find((b) => b.id === btn.getAttribute('data-paid'));
      if (bill) { bill.paid = !bill.paid; save(); render(); }
    });
  });
  const create = document.getElementById('bill-new');
  create.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(create);
    const amount = Number(data.get('amount'));
    const dueDay = Number(data.get('dueDay'));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return;
    state.bills.push({
      id: `bill-${Date.now()}`,
      name: String(data.get('name')).trim(),
      amount: toUSD(amount),
      dueDay,
      cycle: 'Monthly',
      autopay: data.get('autopay') === 'true',
      paid: false,
    });
    save();
    render();
  });
}

currencySelect.value = state.currency;
currencySelect.addEventListener('change', () => {
  state.currency = currencySelect.value;
  save();
  render();
});

const resetBtn = document.getElementById('reset-data');
resetBtn.addEventListener('click', () => {
  const fresh = freshState();
  state.transactions = fresh.transactions;
  state.history = fresh.history;
  state.bills = fresh.bills;
  state.goals = fresh.goals;
  state.budgets = fresh.budgets;
  ui.editing = null;
  ui.filter = 'all';
  ui.search = '';
  save();
  render();
});

window.addEventListener('hashchange', render);
render();
