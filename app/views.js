// Hearthly view rendering. Every page is a function that returns HTML for
// the state it is given; main.js wires the controls afterwards. Money is
// always formatted through fmt(), which applies the active currency.

import { CATEGORIES, categoryById } from './data.js';

export function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function makeFormatter(currency) {
  return function fmt(usd, opts = {}) {
    const value = usd * currency.rate;
    const sign = value < 0 ? '-' : opts.plus && value > 0 ? '+' : '';
    const abs = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
    return `${sign}${currency.symbol}${abs}`;
  };
}

export function monthTitle() {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function totalsFor(transactions) {
  let income = 0;
  let spending = 0;
  for (const t of transactions) {
    if (t.amount < 0) income += -t.amount;
    else spending += t.amount;
  }
  return { income, spending, balance: income - spending };
}

export function spentByCategory(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (t.amount > 0) map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return map;
}

function donutChart(spentMap, fmt) {
  const entries = [...spentMap.entries()]
    .map(([id, value]) => ({ cat: categoryById(id), value }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total <= 0) return '<p class="empty-note">No spending recorded yet this month.</p>';
  const cx = 110;
  const cy = 110;
  const r = 82;
  const inner = 52;
  let angle = -Math.PI / 2;
  const slices = [];
  for (const e of entries) {
    const sweep = (e.value / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const large = sweep > Math.PI ? 1 : 0;
    const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    slices.push(
      `<path d="M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)} Z" fill="${e.cat.color}"><title>${esc(e.cat.label)}: ${esc(fmt(e.value))}</title></path>`,
    );
  }
  const legend = entries
    .map(
      (e) => `<li><span class="dot" style="background:${e.cat.color}"></span><span class="legend-name">${esc(e.cat.label)}</span><span class="legend-value">${esc(fmt(e.value))} · ${Math.round((e.value / total) * 100)}%</span></li>`,
    )
    .join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 220 220" class="donut" role="img" aria-label="Spending by category">${slices.join('')}<text x="${cx}" y="${cy - 6}" class="donut-total">${esc(fmt(total))}</text><text x="${cx}" y="${cy + 16}" class="donut-sub">spent so far</text></svg><ul class="legend">${legend}</ul></div>`;
}

function trendChart(history, current, fmt) {
  const rows = [...history, { label: new Date().toLocaleDateString('en-GB', { month: 'short' }), income: current.income, spending: current.spending }];
  const max = Math.max(...rows.map((r) => Math.max(r.income, r.spending)), 1);
  const w = 560;
  const h = 210;
  const base = 178;
  const top = 18;
  const groupW = w / rows.length;
  const barW = 26;
  const parts = [];
  rows.forEach((row, i) => {
    const gx = i * groupW + groupW / 2;
    const ih = ((base - top) * row.income) / max;
    const sh = ((base - top) * row.spending) / max;
    parts.push(`<rect x="${(gx - barW - 3).toFixed(1)}" y="${(base - ih).toFixed(1)}" width="${barW}" height="${ih.toFixed(1)}" rx="4" fill="#2e7d4f"><title>${esc(row.label)} income: ${esc(fmt(row.income))}</title></rect>`);
    parts.push(`<rect x="${(gx + 3).toFixed(1)}" y="${(base - sh).toFixed(1)}" width="${barW}" height="${sh.toFixed(1)}" rx="4" fill="#b4552d"><title>${esc(row.label)} spending: ${esc(fmt(row.spending))}</title></rect>`);
    parts.push(`<text x="${gx}" y="${base + 20}" class="axis-label">${esc(row.label)}</text>`);
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="trend" role="img" aria-label="Income and spending, last six months"><line x1="0" y1="${base}" x2="${w}" y2="${base}" class="axis-line"/>${parts.join('')}</svg><p class="chart-key"><span class="dot" style="background:#2e7d4f"></span> Income <span class="dot" style="background:#b4552d"></span> Spending</p>`;
}

export function dashboardView(state, fmt) {
  const t = totalsFor(state.transactions);
  const rate = t.income > 0 ? Math.max(0, Math.round((t.balance / t.income) * 100)) : 0;
  const spentMap = spentByCategory(state.transactions);
  const upcoming = upcomingBills(state.bills).slice(0, 3);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const goal = state.goals[0];
  const goalPct = goal ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
  return `
  <section class="hero">
    <div>
      <p class="eyebrow">${esc(monthTitle())} · The Rivera household</p>
      <h1>Your money, calmly in one place.</h1>
      <p class="hero-sub">Income, spending, bills and savings for this month — every figure below is added up live from your ledger, so it can never drift out of step.</p>
    </div>
    <a class="button primary" href="#/ledger">Add an entry</a>
  </section>
  <section class="cards">
    <article class="card stat"><p class="stat-label">Income this month</p><p class="stat-value income">${esc(fmt(t.income))}</p><p class="stat-note">Two salaries plus freelance work</p></article>
    <article class="card stat"><p class="stat-label">Spending this month</p><p class="stat-value">${esc(fmt(t.spending))}</p><p class="stat-note">${state.transactions.filter((x) => x.amount > 0).length} expenses recorded</p></article>
    <article class="card stat"><p class="stat-label">Left this month</p><p class="stat-value">${esc(fmt(t.balance))}</p><p class="stat-note">Income minus spending</p></article>
    <article class="card stat"><p class="stat-label">Savings rate</p><p class="stat-value">${rate}%</p><p class="stat-note">Household aim: 20% or more</p></article>
  </section>
  <section class="grid-two">
    <article class="card">
      <div class="card-head"><h2>Spending by category</h2><a href="#/budgets">See budgets</a></div>
      ${donutChart(spentMap, fmt)}
    </article>
    <article class="card">
      <div class="card-head"><h2>Six-month trend</h2><a href="#/ledger">Open ledger</a></div>
      ${trendChart(state.history, t, fmt)}
      <p class="small-note">This month's bars are computed from the ledger; earlier months are the household's recorded totals.</p>
    </article>
  </section>
  <section class="grid-two">
    <article class="card">
      <div class="card-head"><h2>Coming up</h2><a href="#/bills">All bills</a></div>
      <ul class="mini-list">
        ${upcoming.map((b) => `<li><span>${esc(b.name)}</span><span class="mini-right">${esc(fmt(b.amount))} · due ${esc(b.nextDueLabel)}</span></li>`).join('') || '<li>Nothing due in the next two weeks.</li>'}
      </ul>
      ${goal ? `<div class="goal-peek"><p><strong>${esc(goal.name)}</strong> — ${esc(fmt(goal.saved))} of ${esc(fmt(goal.target))}</p><div class="bar"><span style="width:${goalPct}%"></span></div><p class="small-note">${goalPct}% there. <a href="#/goals">Plan your goals</a></p></div>` : ''}
    </article>
    <article class="card">
      <div class="card-head"><h2>Latest entries</h2><a href="#/ledger">Full ledger</a></div>
      <ul class="mini-list">
        ${recent.map((x) => `<li><span><span class="dot" style="background:${categoryById(x.category).color}"></span> ${esc(x.text)}</span><span class="mini-right ${x.amount < 0 ? 'income' : ''}">${esc(fmt(x.amount))}</span></li>`).join('')}
      </ul>
    </article>
  </section>`;
}

export function ledgerView(state, fmt, ui) {
  const cats = CATEGORIES.map((c) => `<option value="${c.id}" ${ui.editing && ui.editing.category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
  const filterCats = ['<option value="all">All categories</option>', ...CATEGORIES.map((c) => `<option value="${c.id}" ${ui.filter === c.id ? 'selected' : ''}>${esc(c.label)}</option>`)].join('');
  const rows = filteredTransactions(state.transactions, ui)
    .map((t) => {
      const cat = categoryById(t.category);
      return `<tr>
        <td data-label="Date">${esc(prettyDate(t.date))}</td>
        <td data-label="Description">${esc(t.text)}</td>
        <td data-label="Category"><span class="chip"><span class="dot" style="background:${cat.color}"></span>${esc(cat.label)}</span></td>
        <td data-label="Amount" class="amount ${t.amount < 0 ? 'income' : ''}">${esc(fmt(t.amount))}</td>
        <td class="row-actions"><button type="button" class="mini-btn" data-edit="${t.id}">Edit</button><button type="button" class="mini-btn danger" data-delete="${t.id}">Delete</button></td>
      </tr>`;
    })
    .join('');
  const shown = filteredTransactions(state.transactions, ui);
  const shownTotal = shown.reduce((s, t) => s + t.amount, 0);
  const e = ui.editing;
  return `
  <section class="page-head">
    <div><p class="eyebrow">Ledger</p><h1>Every entry, in one list</h1>
    <p class="hero-sub">Add what you spend and earn as it happens. Entries are kept in this browser, and every total on the site is re-added from this list.</p></div>
  </section>
  <section class="grid-ledger">
    <article class="card">
      <h2>${e ? 'Edit entry' : 'Add an entry'}</h2>
      <form id="entry-form" class="entry-form">
        <label>Description<input name="text" required maxlength="60" placeholder="e.g. Weekly shop" value="${e ? esc(e.text) : ''}"></label>
        <label>Amount (${esc(fmt.symbol)})<input name="amount" required type="number" step="0.01" min="0.01" placeholder="0.00" value="${e ? esc(String(fmt.toDisplay(Math.abs(e.amount)))) : ''}"></label>
        <label>Type<select name="kind"><option value="expense" ${e && e.amount > 0 ? 'selected' : ''}>Money out</option><option value="income" ${e && e.amount < 0 ? 'selected' : ''}>Money in</option></select></label>
        <label>Category<select name="category">${cats}</select></label>
        <label>Date<input name="date" required type="date" value="${e ? esc(e.date) : esc(todayISO())}"></label>
        <div class="form-actions">
          <button type="submit" class="button primary">${e ? 'Save changes' : 'Add entry'}</button>
          ${e ? '<button type="button" class="button ghost" id="cancel-edit">Cancel</button>' : ''}
        </div>
      </form>
      <p class="small-note">Tip: pick “Money in” for salary or refunds — the ledger stores it as income and the dashboard counts it on the green side.</p>
    </article>
    <article class="card">
      <div class="card-head"><h2>Entries</h2><span class="small-note">${shown.length} shown</span></div>
      <div class="ledger-tools">
        <label>Filter<select id="filter-category">${filterCats}</select></label>
        <label>Search<input id="filter-text" type="search" placeholder="Search descriptions" value="${esc(ui.search)}"></label>
      </div>
      <div class="table-wrap"><table class="ledger-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No entries match. Add one, or clear the filter.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3">Shown total (money in is negative)</td><td class="amount">${esc(fmt(shownTotal))}</td><td></td></tr></tfoot>
      </table></div>
    </article>
  </section>`;
}

export function filteredTransactions(transactions, ui) {
  const q = (ui.search || '').trim().toLowerCase();
  return [...transactions]
    .filter((t) => ui.filter === 'all' || t.category === ui.filter)
    .filter((t) => !q || t.text.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function prettyDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function budgetsView(state, fmt) {
  const spentMap = spentByCategory(state.transactions);
  const rows = CATEGORIES.filter((c) => c.id !== 'income')
    .map((c) => {
      const spent = spentMap.get(c.id) || 0;
      const budget = state.budgets[c.id] ?? c.budget;
      let pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      const left = budget - spent;
      if (left > 0 && pct === 100) pct = 99;
      const status = left < 0 ? 'over' : pct >= 85 ? 'close' : 'fine';
      const statusText = left < 0 ? `${fmt(-left)} over budget` : pct >= 85 ? 'Getting close' : 'On track';
      return `<article class="card budget-row">
        <div class="budget-top">
          <h3><span class="dot" style="background:${c.color}"></span> ${esc(c.label)}</h3>
          <p class="budget-numbers"><strong>${esc(fmt(spent))}</strong> of ${esc(fmt(budget))}</p>
        </div>
        <div class="bar ${status}"><span style="width:${pct}%"></span></div>
        <div class="budget-foot">
          <span class="status ${status}">${esc(statusText)}</span>
          <span class="small-note">${left >= 0 ? `${esc(fmt(left))} left` : ''} · ${pct}% used</span>
          <form class="budget-edit" data-budget-form="${c.id}"><label>Monthly budget (${esc(fmt.symbol)}) <input type="number" min="0" step="1" name="budget" value="${esc(String(Math.round(fmt.toDisplay(budget))))}"></label><button type="submit" class="mini-btn">Update</button></form>
        </div>
      </article>`;
    })
    .join('');
  const totalBudget = CATEGORIES.filter((c) => c.id !== 'income').reduce((s, c) => s + (state.budgets[c.id] ?? c.budget), 0);
  const t = totalsFor(state.transactions);
  return `
  <section class="page-head"><div><p class="eyebrow">Budgets</p><h1>Budget vs. actual, by category</h1>
  <p class="hero-sub">${esc(monthTitle())}: ${esc(fmt(t.spending))} spent against ${esc(fmt(totalBudget))} of planned budgets. Change any monthly budget and the bars, the status and the totals update everywhere.</p></div></section>
  <section class="budget-list">${rows}</section>`;
}

export function projectedDate(goal) {
  const remaining = goal.target - goal.saved;
  if (remaining <= 0) return { months: 0, label: 'Fully funded — well done!' };
  if (!goal.monthly || goal.monthly <= 0) return { months: null, label: 'Add a monthly amount to see a date' };
  const months = Math.ceil(remaining / goal.monthly);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const when = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return { months, label: `${when} (${months} month${months === 1 ? '' : 's'} to go)` };
}

export function goalsView(state, fmt) {
  const cards = state.goals
    .map((g) => {
      const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
      const proj = projectedDate(g);
      return `<article class="card goal-card">
        <div class="card-head"><h3>${esc(g.name)}</h3><span class="chip">${pct}% saved</span></div>
        <p class="goal-amounts"><strong>${esc(fmt(g.saved))}</strong> of ${esc(fmt(g.target))} <span class="small-note">(${esc(fmt(g.target - g.saved))} to go)</span></p>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <p class="small-note">${esc(g.note)}</p>
        <form class="goal-form" data-goal-form="${g.id}">
          <label>Monthly contribution (${esc(fmt.symbol)}) <input type="number" name="monthly" min="0" step="1" value="${esc(String(Math.round(fmt.toDisplay(g.monthly))))}"></label>
          <button type="submit" class="mini-btn">Recalculate</button>
        </form>
        <p class="projection">On track for: <strong>${esc(proj.label)}</strong></p>
        <div class="goal-actions">
          <form class="goal-form" data-deposit-form="${g.id}"><label>Add a deposit <input type="number" name="deposit" min="0" step="1" placeholder="0"></label><button type="submit" class="mini-btn">Add</button></form>
          <button type="button" class="mini-btn danger" data-delete-goal="${g.id}">Remove goal</button>
        </div>
      </article>`;
    })
    .join('');
  return `
  <section class="page-head"><div><p class="eyebrow">Savings goals</p><h1>Save on purpose, not by luck</h1>
  <p class="hero-sub">Each goal shows when you will get there at the monthly amount you set. Change the amount and the projected date moves — try it.</p></div></section>
  <section class="goal-grid">${cards}</section>
  <article class="card">
    <h2>Start a new goal</h2>
    <form id="goal-new" class="entry-form inline">
      <label>Goal name<input name="name" required maxlength="48" placeholder="e.g. New bike"></label>
      <label>Target amount (${esc(fmt.symbol)})<input name="target" required type="number" min="1" step="1" placeholder="1000"></label>
      <label>Already saved (${esc(fmt.symbol)})<input name="saved" type="number" min="0" step="1" placeholder="0"></label>
      <label>Monthly contribution (${esc(fmt.symbol)})<input name="monthly" required type="number" min="0" step="1" placeholder="100"></label>
      <button type="submit" class="button primary">Create goal</button>
    </form>
  </article>`;
}

export function nextDue(bill, from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const lastThis = new Date(y, m + 1, 0).getDate();
  let due = new Date(y, m, Math.min(bill.dueDay, lastThis));
  if (due < new Date(y, m, from.getDate())) {
    const lastNext = new Date(y, m + 2, 0).getDate();
    due = new Date(y, m + 1, Math.min(bill.dueDay, lastNext));
  }
  const days = Math.round((due - new Date(y, m, from.getDate())) / 86400000);
  return { date: due, days };
}

export function upcomingBills(bills) {
  return bills
    .map((b) => {
      const nd = nextDue(b);
      return {
        ...b,
        nextDueLabel: nd.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        days: b.paid && nd.days > 14 ? nd.days - 30 : nd.days,
        sortDays: nd.days,
      };
    })
    .sort((a, b) => a.sortDays - b.sortDays);
}

export function billsView(state, fmt) {
  const rows = upcomingBills(state.bills)
    .map((b) => {
      const when = b.paid ? `Paid this month · next due ${esc(b.nextDueLabel)}` : b.sortDays === 0 ? 'Due today' : b.sortDays === 1 ? 'Due tomorrow' : `Due in ${b.sortDays} days · ${esc(b.nextDueLabel)}`;
      return `<tr>
        <td data-label="Bill">${esc(b.name)}</td>
        <td data-label="Amount" class="amount">${esc(fmt(b.amount))}</td>
        <td data-label="Due">${esc(when)}</td>
        <td data-label="Cycle">${esc(b.cycle)}</td>
        <td data-label="Auto-pay"><button type="button" class="mini-btn" data-autopay="${b.id}">${b.autopay ? 'On' : 'Off'}</button></td>
        <td data-label="Status"><button type="button" class="mini-btn ${b.paid ? '' : 'primary-mini'}" data-paid="${b.id}">${b.paid ? 'Paid ✓' : 'Mark paid'}</button></td>
      </tr>`;
    })
    .join('');
  const monthlyTotal = state.bills.reduce((s, b) => s + b.amount, 0);
  const unpaid = state.bills.filter((b) => !b.paid);
  const unpaidTotal = unpaid.reduce((s, b) => s + b.amount, 0);
  return `
  <section class="page-head"><div><p class="eyebrow">Bills &amp; subscriptions</p><h1>Nothing sneaks up on you</h1>
  <p class="hero-sub">Every recurring payment in one list, sorted by what is due next. Recurring bills add up to ${esc(fmt(monthlyTotal))} a month; ${esc(fmt(unpaidTotal))} is still to pay this month across ${unpaid.length} bill${unpaid.length === 1 ? '' : 's'}.</p></div></section>
  <article class="card">
    <div class="table-wrap"><table class="ledger-table bills-table">
      <thead><tr><th>Bill</th><th>Amount</th><th>Due</th><th>Cycle</th><th>Auto-pay</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="small-note">Toggle auto-pay or mark a bill paid and the list re-sorts itself. Small subscriptions are easy to forget — the family cloud backup at ${esc(fmt(3.99))} is in here on purpose.</p>
  </article>
  <article class="card">
    <h2>Add a bill or subscription</h2>
    <form id="bill-new" class="entry-form inline">
      <label>Name<input name="name" required maxlength="48" placeholder="e.g. Council tax"></label>
      <label>Amount (${esc(fmt.symbol)})<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"></label>
      <label>Due day of month<input name="dueDay" required type="number" min="1" max="31" placeholder="15"></label>
      <label>Auto-pay<select name="autopay"><option value="true">On</option><option value="false">Off</option></select></label>
      <button type="submit" class="button primary">Add bill</button>
    </form>
  </article>`;
}

export function missingView() {
  return `<section class="page-head"><div><p class="eyebrow">Not found</p><h1>That page is not here</h1><p class="hero-sub">Try the dashboard, the ledger, budgets, goals or bills from the menu above.</p></div></section>`;
}
