# Hearthly — Household Budget

[![best-household-budget-site-20261126-1457 on make.fun](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/Ash9at/makefun-best-household-budget-site/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/Ash9at/makefun-best-household-budget-site/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)

An entry for make.fun's [best-household-budget-site-20261126-1457](https://make.fun/bounty/best-household-budget-site-20261126-1457) bounty — see [make.fun](https://make.fun).

Hearthly is a household budget site that runs entirely in the browser: a dashboard with this month's income, spending, balance and savings rate, a working ledger (add, edit, delete, filter and search entries, kept in localStorage), budget-vs-actual bars for eight categories with editable monthly budgets, hand-drawn SVG charts (spending by category and a six-month income/spending trend), a savings-goals planner that projects the date each goal is reached from its monthly contribution, and a bills & subscriptions page sorted by next due date with auto-pay toggles and mark-as-paid. A header selector switches the display currency between USD, JPY and EUR and converts every figure on the site, forms included. Every total is re-added live from the ledger, so the pages can never disagree with each other.

## Run it locally

Serve the site:

```
node serve.ts
```

then open http://localhost:8080 (hash routes: `#/` dashboard, `#/ledger`, `#/budgets`, `#/goals`, `#/bills`).

Build the hand-in dossier the way the grader does:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/` — the site itself: plain static HTML, CSS and ES modules, no build step, no network requests.
  - `index.html` — page shell, header, navigation and the currency selector.
  - `data.js` — categories and budgets, the sample month of entries, earlier-month totals, bills, goals and currency rates.
  - `views.js` — one render function per page, plus the SVG donut and trend charts.
  - `main.js` — state, localStorage persistence, hash routing and every control's handler.
  - `style.css` — the warm paper-and-terracotta look, responsive down to phone width.
- `main.ts` — copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — a tiny static server for local development.
- `screenshots/` — four renders of the real site (dashboard, budgets, goals, and the ledger on a phone), listed in `shots.json`.
- `vendor/makefun-frontend.ts` — make.fun's dossier library, byte-identical to the kit's.

## License

MIT — see `LICENSE`.
