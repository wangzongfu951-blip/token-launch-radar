// Token Launch Radar — the dashboard page.
// Renders window.RADAR (written by main.ts) with no network: the ranked
// pre-token board, a detail view per protocol with its farm plan, and the
// live-token view. Farm plans are generated here from the same rules as
// lib/model.ts, so the data file stays compact. Deep links: #detail=<slug>
// opens one protocol, #cat=<category> applies a category filter.

'use strict';
const D = window.RADAR;
const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const shortMoney = (n) => {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return money(n);
};
const pct = (n) => (n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');
const pctClass = (n) => (n === null || n === undefined ? 'flat' : n > 0.05 ? 'up' : n < -0.05 ? 'down' : 'flat');
const ageText = (d) => (d === null || d === undefined ? 'unknown' : d >= 365 ? (d / 365).toFixed(1) + 'y' : d + 'd');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** The first two chains, plus how many more there are: the table keeps its columns in view. */
const chainText = (chains) => {
  const list = chains || [];
  if (list.length === 0) return '—';
  return list.slice(0, 2).join(', ') + (list.length > 2 ? ' +' + (list.length - 2) + ' more' : '');
};

// ---- farm plans, mirroring lib/model.ts ----
function capitalFor(tvl) {
  if (tvl >= 1e9) return 250;
  if (tvl >= 1e8) return 150;
  if (tvl >= 5e7) return 100;
  return 50;
}
function holdDaysFor(age) {
  if (age === null || age === undefined) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}
function actionFor(r, capital, chain) {
  const c = (r.category || '').toLowerCase();
  const name = r.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ', then borrow a small amount against it and repay it the same week.';
  if (c.includes('dex')) return 'Provide $' + capital + ' of liquidity to ' + name + "'s largest pool on " + chain + ' and keep the position open.';
  if (c.includes('yield aggregator') || c.includes('curator') || c.includes('allocator')) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares while it allocates.';
  if (c.includes('yield') || c.includes('leveraged farm')) return 'Deposit $' + capital + ' into ' + name + "'s main yield vault on " + chain + ' and let it compound.';
  if (c.includes('bridge')) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ', then use the bridged funds inside its app.';
  if (c.includes('staking') || c.includes('restak')) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt token.';
  if (c.includes('perpetual') || c.includes('derivative')) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position, well below liquidation.';
  if (c.includes('prediction')) return 'Fund $' + capital + ' on ' + name + ' and place one small position on a market that closes within the week.';
  if (c.includes('stable')) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it.';
  if (c.includes('rwa')) return "Mint $" + capital + " of the protocol's yield-bearing asset on " + chain + ' and hold it through one distribution.';
  if (c.includes('insurance')) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
  if (c.includes('privacy')) return 'Run $' + capital + ' through ' + name + "'s private pool on " + chain + ' and withdraw it to a fresh address.';
  if (c.includes('index')) return 'Buy $' + capital + ' of the ' + name + ' index on ' + chain + ' and hold it through one rebalance.';
  return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
}
function weeklyFor(r) {
  const c = (r.category || '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'a supply top-up, a borrow or a repayment';
  if (c.includes('dex')) return 'a swap through the pool or a small liquidity add';
  if (c.includes('bridge')) return 'a bridge in either direction';
  if (c.includes('staking') || c.includes('restak')) return 'a restake of the rewards or a small extra stake';
  if (c.includes('perpetual') || c.includes('derivative')) return 'one small trade or a margin adjustment';
  if (c.includes('prediction')) return 'one new market position';
  if (c.includes('rwa') || c.includes('stable')) return 'a mint, a redeem or a transfer of the asset';
  if (c.includes('yield') || c.includes('curator') || c.includes('allocator')) return 'a deposit, a harvest or a vault switch';
  return 'a deposit, a swap, a vote or a claim';
}
function farmSteps(r) {
  const chain = r.chains && r.chains.length ? r.chains[0] : 'its main chain';
  const capital = capitalFor(r.tvl_usd);
  const hold = holdDaysFor(r.age_days);
  const gas = capital >= 150 ? 8 : 4;
  return [
    ['Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', 'under $3 of gas for the first transaction', '5 minutes'],
    [actionFor(r, capital, chain), '$' + capital + ' of capital and about $' + gas + ' of gas', '15 minutes to set up'],
    ['Make one qualifying action each week — ' + weeklyFor(r) + ' — so the wallet shows steady use instead of a single deposit.', 'about $2 of gas a week', '10 minutes a week'],
    ['Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', 'the $' + capital + ' stays in the position', hold + ' days'],
    ["Before you withdraw, open the protocol's own points or rewards page from its official site and claim only from the link it publishes.", 'no fee to check, and never pay to claim', '10 minutes'],
    ['Write the wallet, the dates and every transaction hash in a farm log, so you can repeat the position or unwind it cleanly.', 'nothing but the log', '5 minutes'],
  ];
}

// ---- state and filtering ----
const state = { view: 'board', q: '', cat: '', chain: '', mintvl: 0, sort: 'implied', sel: null };
function applyHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const parts = h.split('&');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq), v = part.slice(eq + 1);
    if (k === 'detail') state.sel = v;
    if (k === 'cat') { state.cat = v; $('cat').value = v; }
    if (k === 'chain') { state.chain = v; $('chain').value = v; }
    if (k === 'view' && (v === 'board' || v === 'live')) state.view = v;
  }
}
function filtered() {
  let rows = state.view === 'board' ? D.rows : D.live;
  const q = state.q.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  if (state.cat) rows = rows.filter((r) => (r.category || 'Uncategorised') === state.cat);
  if (state.chain) rows = rows.filter((r) => (r.chains || []).includes(state.chain));
  if (state.mintvl) rows = rows.filter((r) => r.tvl_usd >= state.mintvl);
  const key = {
    implied: (r) => -(r.implied_value_usd || r.mcap_usd || 0),
    tvl: (r) => -r.tvl_usd,
    growth: (r) => -(r.change_7d === null ? -1e9 : r.change_7d),
    age: (r) => -(r.age_days === null || r.age_days === undefined ? -1 : r.age_days),
    name: null,
  }[state.sort];
  rows = [...rows];
  if (state.sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
  else rows.sort((a, b) => key(a) - key(b) || a.slug.localeCompare(b.slug));
  return rows;
}

// ---- rendering ----
function renderStats() {
  $('stats').innerHTML = [
    ['Snapshot', D.as_of],
    ['Watchlist', D.watchlist_size + ' protocols'],
    ['Board', D.board_size + ' pre-token rows'],
    ['Live tokens shown', String(D.live_size)],
    ['Model', D.model_version],
  ].map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('');
  $('asof').textContent = D.as_of;
}
function renderControls() {
  const cats = [...new Set(D.rows.map((r) => r.category || 'Uncategorised'))].sort();
  $('cat').innerHTML = '<option value="">All categories</option>' + cats.map((c) => '<option>' + esc(c) + '</option>').join('');
  const chains = [...new Set(D.rows.flatMap((r) => r.chains || []))].sort();
  $('chain').innerHTML = '<option value="">All chains</option>' + chains.map((c) => '<option>' + esc(c) + '</option>').join('');
}
function renderBoard() {
  const rows = filtered();
  $('tab-board').classList.toggle('on', state.view === 'board');
  $('tab-live').classList.toggle('on', state.view === 'live');
  $('count').textContent = 'Showing ' + rows.length + ' of ' + (state.view === 'board' ? D.rows.length : D.live.length) +
    (state.view === 'board' ? ' pre-token protocols — click a row for its detail view and farm plan.' : ' live-token protocols, at the market\u2019s own values.');
  const maxVal = Math.max(1, ...rows.map((r) => r.implied_value_usd || r.mcap_usd || 0));
  $('rows').innerHTML = rows.map((r, i) => {
    const val = state.view === 'board' ? r.implied_value_usd : (r.mcap_usd || 0);
    const w = Math.max(2, Math.round((val / maxVal) * 64));
    return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
      '<td>' + (state.view === 'board' ? r.rank : i + 1) + '</td>' +
      '<td>' + esc(r.name) + '<span class="slug">' + esc(r.slug) + '</span></td>' +
      '<td><span class="badge">' + esc(r.category || 'Uncategorised') + '</span></td>' +
      '<td>' + esc(chainText(r.chains)) + '</td>' +
      '<td class="num">' + shortMoney(r.tvl_usd) + '</td>' +
      '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td class="num"><span class="bar" style="width:' + w + 'px"></span>' + shortMoney(val) + '</td></tr>';
  }).join('');
}
function renderDetail() {
  const el = $('detail');
  const r = D.rows.find((x) => x.slug === state.sel) || D.live.find((x) => x.slug === state.sel);
  if (!r) { el.hidden = true; el.innerHTML = ''; return; }
  const isBoard = 'implied_value_usd' in r;
  const steps = isBoard ? farmSteps(r) : [];
  el.hidden = false;
  el.innerHTML =
    '<button class="close" id="detail-close" type="button">Close</button>' +
    '<h2>' + esc(r.name) + '</h2>' +
    '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + (isBoard ? 'records no token' : 'token already trades') + '</p>' +
    '<dl class="kv">' +
    '<div><dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd></div>' +
    '<div><dt>7-day change</dt><dd class="' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</dd></div>' +
    '<div><dt>Listed</dt><dd>' + esc(r.listed_at || 'unknown') + '</dd></div>' +
    '<div><dt>Age</dt><dd>' + ageText(r.age_days) + '</dd></div>' +
    '<div><dt>Chains</dt><dd>' + esc((r.chains || []).join(', ') || '—') + '</dd></div>' +
    (isBoard
      ? '<div><dt>Rank</dt><dd>#' + r.rank + ' of ' + D.board_size + '</dd></div>' +
        '<div><dt>Implied value</dt><dd>' + money(r.implied_value_usd) + '</dd></div>' +
        '<div><dt>Category multiple</dt><dd>' + r.multiple.toFixed(2) + '×</dd></div>' +
        '<div><dt>Growth ×</dt><dd>' + r.growth_multiplier.toFixed(2) + '</dd></div>' +
        '<div><dt>Maturity ×</dt><dd>' + r.maturity_multiplier.toFixed(2) + '</dd></div>' +
        '<div><dt>Breadth ×</dt><dd>' + r.breadth_multiplier.toFixed(2) + '</dd></div>'
      : '<div><dt>Market cap</dt><dd>' + (r.mcap_usd ? money(r.mcap_usd) : '—') + '</dd></div>' +
        '<div><dt>Market cap / TVL</dt><dd>' + (r.mcap_tvl === null ? '—' : r.mcap_tvl.toFixed(2) + '×') + '</dd></div>') +
    '</dl>' +
    (isBoard
      ? '<h3>Farm plan</h3><ol class="steps">' + steps.map((s) => '<li>' + esc(s[0]) + ' <b>Cost:</b> ' + esc(s[1]) + '. <b>Time:</b> ' + esc(s[2]) + '.</li>').join('') + '</ol>' +
        '<p class="note">Implied value is this board\u2019s own claim from the snapshot\u2019s figures, not a prediction that a token will launch.</p>'
      : '<p class="note">This token already trades, so the board shows the market\u2019s own value and keeps it off the pre-token ranking.</p>');
  $('detail-close').addEventListener('click', () => { state.sel = null; history.replaceState(null, '', '#'); renderDetail(); renderBoard(); });
}
function renderMultiples() {
  const rows = [...D.multiples].sort((a, b) => b.multiple - a.multiple);
  document.querySelector('#multiples tbody').innerHTML = rows.map((m) =>
    '<tr><td>' + esc(m.category) + '</td><td class="num">' + m.multiple.toFixed(2) + '×</td><td class="num">' + m.samples + '</td><td>' + esc(m.source) + '</td></tr>'
  ).join('');
}
function render() { renderBoard(); renderDetail(); }

// ---- events ----
$('q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
$('cat').addEventListener('change', (e) => { state.cat = e.target.value; render(); });
$('chain').addEventListener('change', (e) => { state.chain = e.target.value; render(); });
$('mintvl').addEventListener('change', (e) => { state.mintvl = Number(e.target.value); render(); });
$('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
$('tab-board').addEventListener('click', () => { state.view = 'board'; render(); });
$('tab-live').addEventListener('click', () => { state.view = 'live'; render(); });
$('rows').addEventListener('click', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  state.sel = tr.dataset.slug;
  render();
  $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

renderStats();
renderControls();
renderMultiples();
applyHash();
render();
