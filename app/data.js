// Hearthly seed data. Everything the site shows on first load lives here:
// the category list with monthly budgets, one realistic month of ledger
// entries, five earlier months of totals for the trend chart, the recurring
// bills and the savings goals. Dates are built relative to the current
// month so "this month" is always the month on screen. Amounts are stored
// in US dollars; the display layer converts them to the chosen currency.

export const CATEGORIES = [
  { id: 'housing', label: 'Housing', color: '#b4552d', budget: 1650 },
  { id: 'groceries', label: 'Groceries', color: '#4d7c4d', budget: 620 },
  { id: 'dining', label: 'Dining out', color: '#c98a1b', budget: 240 },
  { id: 'transport', label: 'Transport', color: '#3f6d8e', budget: 190 },
  { id: 'utilities', label: 'Utilities', color: '#7a5ea8', budget: 280 },
  { id: 'health', label: 'Health', color: '#b04a6e', budget: 150 },
  { id: 'home', label: 'Home & kids', color: '#2f7f7a', budget: 210 },
  { id: 'fun', label: 'Fun & leisure', color: '#5468b8', budget: 180 },
  { id: 'income', label: 'Income', color: '#2e7d4f', budget: 0 },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

function dayInCurrentMonth(day) {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const d = Math.min(day, last);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

let seq = 0;
function entry(day, text, category, amount) {
  seq += 1;
  return { id: `seed-${seq}`, date: dayInCurrentMonth(day), text, category, amount };
}

// Positive amounts are money out, negative amounts are money in. The two
// salary rows and the freelance row are this month's income.
export function seedTransactions() {
  seq = 0;
  return [
    entry(1, 'Salary — Maya (teaching)', 'income', -2840),
    entry(1, 'Salary — Jon (warehouse)', 'income', -1960),
    entry(1, 'Rent — Maple Street flat', 'housing', 1625),
    entry(2, 'Weekly shop — Green Basket', 'groceries', 128.4),
    entry(3, 'Bus fares and tram top-up', 'transport', 36),
    entry(4, 'Pharmacy — prescriptions', 'health', 27.6),
    entry(5, 'Home insurance instalment', 'housing', 24),
    entry(6, 'Pizza night with the kids', 'dining', 44.5),
    entry(7, 'Fuel — family car', 'transport', 52.3),
    entry(8, 'School lunches — November', 'home', 58),
    entry(9, 'Weekly shop — Green Basket', 'groceries', 117.9),
    entry(10, 'Internet — FibreHome', 'utilities', 59),
    entry(11, 'Cinema — two adults, two kids', 'fun', 38),
    entry(12, 'Freelance proofreading — Maya', 'income', -230),
    entry(12, 'Coffee and cake — Café Lumen', 'dining', 18.4),
    entry(13, 'Cleaning supplies and bulbs', 'home', 33.7),
    entry(14, 'Dentist — check-up copay', 'health', 45),
    entry(15, 'Mobile phones — two lines', 'utilities', 68),
    entry(16, 'Weekly shop — Green Basket', 'groceries', 104.2),
    entry(17, 'Train tickets — visiting gran', 'transport', 61.5),
    entry(18, 'Electricity — City Power', 'utilities', 96.4),
    entry(19, 'Books and a board game', 'fun', 41.9),
    entry(20, 'Lunch out — noodle bar', 'dining', 27.8),
    entry(21, 'New winter boots — Sam', 'home', 49.9),
    entry(22, 'Water and sewerage', 'utilities', 47.8),
    entry(23, 'Weekly shop — Green Basket', 'groceries', 96.6),
    entry(24, 'Fuel — family car', 'transport', 47.9),
    entry(24, 'Bakery and market extras', 'groceries', 38.3),
    entry(25, 'Gym — Jon, monthly', 'fun', 39),
  ];
}

// Totals for the five months before this one, oldest first. The current
// month is never stored here: the trend chart computes it live from the
// ledger, so the chart always agrees with the entries on screen.
export function seedHistory() {
  const now = new Date();
  const rows = [
    { income: 4920, spending: 3410 },
    { income: 4920, spending: 3185 },
    { income: 5030, spending: 3520 },
    { income: 4800, spending: 3290 },
    { income: 5030, spending: 3065 },
  ];
  return rows.map((row, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (rows.length - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      income: row.income,
      spending: row.spending,
    };
  });
}

export function seedBills() {
  return [
    { id: 'bill-rent', name: 'Rent — Maple Street flat', amount: 1625, dueDay: 1, cycle: 'Monthly', autopay: true, paid: true },
    { id: 'bill-insurance', name: 'Home insurance', amount: 24, dueDay: 5, cycle: 'Monthly', autopay: true, paid: true },
    { id: 'bill-internet', name: 'Internet — FibreHome', amount: 59, dueDay: 10, cycle: 'Monthly', autopay: true, paid: true },
    { id: 'bill-music', name: 'Music streaming — family plan', amount: 12, dueDay: 12, cycle: 'Monthly', autopay: true, paid: true },
    { id: 'bill-phone', name: 'Mobile phones — two lines', amount: 68, dueDay: 15, cycle: 'Monthly', autopay: false, paid: true },
    { id: 'bill-electric', name: 'Electricity — City Power', amount: 96.4, dueDay: 18, cycle: 'Monthly', autopay: false, paid: true },
    { id: 'bill-video', name: 'Video streaming', amount: 15.5, dueDay: 20, cycle: 'Monthly', autopay: true, paid: false },
    { id: 'bill-water', name: 'Water and sewerage', amount: 47.8, dueDay: 22, cycle: 'Monthly', autopay: false, paid: true },
    { id: 'bill-gym', name: 'Gym — Jon', amount: 39, dueDay: 28, cycle: 'Monthly', autopay: true, paid: false },
    { id: 'bill-cloud', name: 'Photo backup — family cloud', amount: 3.99, dueDay: 29, cycle: 'Monthly', autopay: true, paid: false },
  ];
}

export function seedGoals() {
  return [
    { id: 'goal-emergency', name: 'Emergency cushion', target: 10000, saved: 6400, monthly: 350, note: 'Six months of essentials, kept in a separate savings account.' },
    { id: 'goal-trip', name: 'Family trip to the coast', target: 2400, saved: 950, monthly: 180, note: 'Five days next summer: cottage, train fares and plenty of ice cream.' },
    { id: 'goal-washer', name: 'New washing machine', target: 900, saved: 620, monthly: 90, note: 'The current one works, but the spin cycle sounds like a drum solo.' },
  ];
}

export const CURRENCIES = {
  USD: { label: 'US dollar', symbol: '$', rate: 1, decimals: 2 },
  JPY: { label: 'Japanese yen', symbol: '¥', rate: 155, decimals: 0 },
  EUR: { label: 'Euro', symbol: '€', rate: 0.92, decimals: 2 },
};
