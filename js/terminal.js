/**
 * terminal.js — Shell logic for Databasis crypto terminal
 * Side-effects only module; no exports.
 */

import { BASIS_MINT, HELIUS_URL, HELIUS_TXS_URL, BASIS_SUPPLY, DEX_LINK, heliusAddrTxsUrl } from './config.js';

/* ────────────────────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────────────────────── */

/** Format price based on magnitude */
function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  if (n < 0.001) return '$' + n.toFixed(8);
  if (n < 0.01)  return '$' + n.toFixed(6);
  return '$' + n.toFixed(4);
}

/** Compact large numbers: 1234567 → 1.23M */
function compactNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return n.toFixed(2);
}

/** Time-ago string from unix timestamp */
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)    return diff + 's ago';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

/** ISO-like UTC timestamp string */
function nowUTC() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
}

/* ────────────────────────────────────────────────────────────
   Navigation
   ──────────────────────────────────────────────────────────── */

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const panes    = document.querySelectorAll('.tab-pane');

  function activateTab(tab) {
    navItems.forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    panes.forEach(el => {
      el.classList.toggle('active', el.id === 'tab-' + tab);
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      activateTab(tab);
      // On mobile, close sidebar after navigation
      closeSidebar();
    });
  });

  // Activate the first tab by default if none is active
  const firstActive = document.querySelector('.nav-item.active[data-tab]');
  if (!firstActive && navItems.length) {
    activateTab(navItems[0].dataset.tab);
  }
}

/* ────────────────────────────────────────────────────────────
   Sidebar toggle
   ──────────────────────────────────────────────────────────── */

function openSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  sidebar?.classList.add('open');
  backdrop?.classList.add('show');
}

function closeSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  sidebar?.classList.remove('open');
  backdrop?.classList.remove('show');
}

function initSidebarToggle() {
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar?.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    closeSidebar();
  });
}

/* ────────────────────────────────────────────────────────────
   Live timestamp
   ──────────────────────────────────────────────────────────── */

function initTimestamp() {
  function update() {
    const ts = nowUTC();
    const tfTs   = document.getElementById('tf-timestamp');
    const dashTs = document.getElementById('dash-timestamp');
    if (tfTs)   tfTs.textContent   = ts;
    if (dashTs) dashTs.textContent = ts;
  }
  update();
  setInterval(update, 1000);
}

/* ────────────────────────────────────────────────────────────
   Block counter (Solana speed simulation)
   ──────────────────────────────────────────────────────────── */

function initBlockCounter() {
  const el = document.getElementById('tf-block-count');
  if (!el) return;

  let count = 319847203 + Math.floor(Math.random() * 5000);

  function tick() {
    count += Math.floor(Math.random() * 2) + 2; // +2 or +3
    el.textContent = count.toLocaleString();
  }

  tick();
  setInterval(tick, 400);
}

/* ────────────────────────────────────────────────────────────
   Price chart
   ──────────────────────────────────────────────────────────── */

let chartTimeframe  = '1D';
let currentPrice    = null;
let currentPrices   = null; // cached array for redraws

const TIMEFRAME_VOLATILITY = {
  '1H': 0.008,
  '4H': 0.018,
  '1D': 0.035,
  '1W': 0.06,
};

const TIMEFRAME_LABELS = {
  '1H': ['−60m', '−45m', '−30m', '−15m', 'NOW'],
  '4H': ['−4H',  '−3H',  '−2H',  '−1H',  'NOW'],
  '1D': ['−24H', '−18H', '−12H', '−6H',  'NOW'],
  '1W': ['−7D',  '−5D',  '−3D',  '−1D',  'NOW'],
};

function getVolatility() {
  return TIMEFRAME_VOLATILITY[chartTimeframe] ?? 0.035;
}

/** Generate random-walk price history ending at lastPrice */
function generatePriceHistory(lastPrice, count = 80, volatility = 0.025) {
  const raw = [1.0];
  for (let i = 1; i < count; i++) {
    const change = 1 + (Math.random() - 0.5) * 2 * volatility;
    raw.push(raw[i - 1] * change);
  }
  // Scale so last value = lastPrice
  const scale = lastPrice / raw[raw.length - 1];
  return raw.map(v => v * scale);
}

/** Format a Y-axis price label */
function fmtYLabel(n) {
  if (n < 0.001) return '$' + n.toFixed(7);
  if (n < 0.01)  return '$' + n.toFixed(5);
  if (n < 1)     return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}

/** Draw the price chart on the canvas */
function drawChart(prices) {
  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set physical pixel size
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width  || canvas.parentElement?.clientWidth || 600;
  const cssH = 200;

  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.height = cssH + 'px';

  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;

  const padLeft   = 62;
  const padRight  = 12;
  const padTop    = 10;
  const padBottom = 28;

  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  function xOf(i) {
    return padLeft + (i / (prices.length - 1)) * chartW;
  }

  function yOf(p) {
    return padTop + chartH - ((p - minP) / range) * chartH;
  }

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Horizontal grid lines + Y labels
  const gridLines = 5;
  ctx.font = `${0.62 * 14}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'right';

  for (let i = 0; i <= gridLines; i++) {
    const frac  = i / gridLines;
    const price = minP + frac * range;
    const y     = padTop + chartH - frac * chartH;

    ctx.strokeStyle = 'rgba(120,177,90,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(120,177,90,0.45)';
    ctx.fillText(fmtYLabel(price), padLeft - 4, y + 4);
  }

  // X-axis labels
  const xLabels = TIMEFRAME_LABELS[chartTimeframe] ?? TIMEFRAME_LABELS['1D'];
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(120,177,90,0.40)';

  xLabels.forEach((label, idx) => {
    const frac = idx / (xLabels.length - 1);
    const x    = padLeft + frac * chartW;
    ctx.fillText(label, x, H - 6);
  });

  // Gradient area fill
  const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
  grad.addColorStop(0, 'rgba(120,177,90,0.18)');
  grad.addColorStop(1, 'rgba(120,177,90,0.01)');

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(prices[0]));
  for (let i = 1; i < prices.length; i++) {
    ctx.lineTo(xOf(i), yOf(prices[i]));
  }
  ctx.lineTo(xOf(prices.length - 1), padTop + chartH);
  ctx.lineTo(xOf(0), padTop + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Price line
  ctx.beginPath();
  ctx.strokeStyle = '#78b15a';
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.moveTo(xOf(0), yOf(prices[0]));
  for (let i = 1; i < prices.length; i++) {
    ctx.lineTo(xOf(i), yOf(prices[i]));
  }
  ctx.stroke();

  // Current price dot
  const lastX = xOf(prices.length - 1);
  const lastY = yOf(prices[prices.length - 1]);

  // Outer ring
  ctx.beginPath();
  ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(120,177,90,0.35)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#78b15a';
  ctx.fill();

  currentPrices = prices;
}

function initChart() {
  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  // Chart tab clicks
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chartTimeframe = btn.dataset.tf ?? '1D';

      if (currentPrice != null) {
        drawChart(generatePriceHistory(currentPrice, 80, getVolatility()));
      }
    });
  });

  // ResizeObserver
  const ro = new ResizeObserver(() => {
    if (currentPrices) {
      drawChart(currentPrices);
    }
  });
  ro.observe(canvas.parentElement ?? canvas);
}

/* ────────────────────────────────────────────────────────────
   Price event listener
   ──────────────────────────────────────────────────────────── */

let firstPriceLoaded = false;

function initPriceListener() {
  window.addEventListener('basisPriceUpdate', e => {
    const { basisPrice, solPrice, mcap, vol24h, liq, priceChange24h } = e.detail ?? {};

    // ── Topbar ticker ──
    const tbSol    = document.getElementById('tb-sol');
    const tbBasis  = document.getElementById('tb-basis');
    const tbMcap   = document.getElementById('tb-mcap');
    const tbChange = document.getElementById('tb-change');

    if (tbSol)    tbSol.textContent    = fmtPrice(solPrice);
    if (tbBasis)  tbBasis.textContent  = fmtPrice(basisPrice);
    if (tbMcap)   tbMcap.textContent   = '$' + compactNum(mcap);

    if (tbChange) {
      const pct = priceChange24h ?? 0;
      tbChange.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      tbChange.classList.toggle('pos', pct >= 0);
      tbChange.classList.toggle('neg', pct < 0);
    }

    // ── Metric cards ──
    const mcSol   = document.getElementById('mc-sol-val');
    const mcBasis = document.getElementById('mc-basis-val');
    const mcMcap  = document.getElementById('mc-mcap-val');
    const mcVol   = document.getElementById('mc-vol-val');
    const mcLiq   = document.getElementById('mc-liq-val');
    const mcChg   = document.getElementById('mc-basis-chg');

    if (mcSol)   { mcSol.textContent   = fmtPrice(solPrice);        mcSol.classList.remove('loading'); }
    if (mcBasis) { mcBasis.textContent = fmtPrice(basisPrice);      mcBasis.classList.remove('loading'); }
    if (mcMcap)  { mcMcap.textContent  = '$' + compactNum(mcap);    mcMcap.classList.remove('loading'); }
    if (mcVol)   { mcVol.textContent   = '$' + compactNum(vol24h);  mcVol.classList.remove('loading'); }
    if (mcLiq)   { mcLiq.textContent   = '$' + compactNum(liq);     mcLiq.classList.remove('loading'); }

    if (mcChg) {
      const pct = priceChange24h ?? 0;
      const sign = pct >= 0 ? '+' : '−';
      mcChg.textContent = sign + Math.abs(pct).toFixed(2) + '%';
      mcChg.classList.toggle('pos', pct >= 0);
      mcChg.classList.toggle('neg', pct < 0);
    }

    // ── Ticker status ──
    const tickerStatus = document.getElementById('ticker-status');
    if (tickerStatus) {
      tickerStatus.textContent = 'LIVE';
      tickerStatus.classList.add('live');
    }

    // ── Chart ──
    currentPrice = basisPrice;

    if (!firstPriceLoaded && basisPrice != null) {
      firstPriceLoaded = true;
      drawChart(generatePriceHistory(basisPrice, 80, getVolatility()));
    }
  });
}

/* ────────────────────────────────────────────────────────────
   Recent transactions
   ──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   Activity feed — Helius enhanced-tx parsing
   Patterns mirror basis-bot/src/blockchain/parser.py: identify the trader
   from BASIS tokenTransfers, classify direction by SOL flow in
   nativeTransfers, and exclude pool/system addresses from "trader".
   The solana-dev skill's "untrusted on-chain data" rule applies: we
   validate every base58 string before interpolating into the DOM.
   ──────────────────────────────────────────────────────────── */

// Pool / system / DEX program accounts that should never be displayed as
// the "trader" — they're counterparties, not users. Sourced from the
// basis-bot parser's hardcoded list (the bot has been running against
// $BASIS for weeks with this set).
const SYSTEM_ACCOUNTS = new Set([
  '11111111111111111111111111111111',                       // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',           // SPL Token
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bPX',          // Associated Token
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',          // Raydium AMM
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',           // Orca Whirlpool
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',           // pump.fun
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',           // Jupiter v6
  'ComputeBudget111111111111111111111111111111',
  'SysvarRent111111111111111111111111111111111',
  'SysvarC1ock11111111111111111111111111111111',
]);

// Cosmetic mapping from Helius `source` enum → terse display badge.
const SOURCE_LABEL = {
  PUMP_FUN: 'pump.fun',
  RAYDIUM:  'raydium',
  ORCA:     'orca',
  JUPITER:  'jupiter',
  METEORA:  'meteora',
  PHOENIX:  'phoenix',
  LIFINITY: 'lifinity',
  SOLANA_PROGRAM_LIBRARY: 'spl',
  SYSTEM_PROGRAM: 'system',
};

// Strict base58 validation. Helius is trusted but transitively-rendered
// strings should never be assumed safe — defense-in-depth from the
// solana-dev skill's "treat on-chain data as untrusted" guidance.
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;
const isValidPubkey = (s) => typeof s === 'string' && BASE58_RE.test(s);
const isValidSig    = (s) => typeof s === 'string' && BASE58_RE.test(s);

// Format a $BASIS amount for the table. Tokens with 6 decimals can be huge,
// so use compact notation past 1k for readability without losing scale.
function fmtBasisAmount(n) {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  if (n >= 1)         return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

// Format SOL amount — small numbers need precision, larger ones don't.
function fmtSolAmount(n) {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 100) return n.toFixed(1);
  if (n >= 1)   return n.toFixed(3);
  return n.toFixed(4);
}

function shortAddr(addr) {
  if (!isValidPubkey(addr)) return '—';
  return addr.slice(0, 4) + '…' + addr.slice(-4);
}

/**
 * Parse a Helius enhanced transaction into a renderable activity row.
 * Returns null when the tx isn't a meaningful $BASIS event we want to show.
 *
 * Direction classification (mirrors basis-bot/parser.py):
 *   BUY      — $BASIS flowing TO a non-system wallet AND SOL flowing FROM
 *              that same wallet → user spent SOL to acquire $BASIS
 *   SELL     — $BASIS flowing FROM a non-system wallet AND SOL flowing TO
 *              that same wallet → user dumped $BASIS for SOL
 *   TRANSFER — $BASIS moved between two non-system wallets, no SOL leg
 *   RECEIVE  — inbound $BASIS without a corresponding SOL outflow
 *              (airdrop, claim, mint, LP withdraw, etc.)
 */
function parseBasisActivity(tx) {
  if (!tx || typeof tx !== 'object') return null;
  if (tx.transactionError) return null;        // failed tx — skip

  const sig = tx.signature;
  if (!isValidSig(sig)) return null;

  const tokenTransfers  = Array.isArray(tx.tokenTransfers)  ? tx.tokenTransfers  : [];
  const nativeTransfers = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];

  const basisLegs = tokenTransfers.filter(t => t && t.mint === BASIS_MINT);
  if (basisLegs.length === 0) return null;

  // Aggregate per non-system user account so multi-instruction swaps that
  // split a single user's flow across several legs collapse correctly.
  const inflow  = new Map();
  const outflow = new Map();
  for (const leg of basisLegs) {
    const amt = Number(leg.tokenAmount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const to   = leg.toUserAccount;
    const from = leg.fromUserAccount;
    if (isValidPubkey(to)   && !SYSTEM_ACCOUNTS.has(to))   inflow.set(to,   (inflow.get(to)   ?? 0) + amt);
    if (isValidPubkey(from) && !SYSTEM_ACCOUNTS.has(from)) outflow.set(from, (outflow.get(from) ?? 0) + amt);
  }

  const candidates = [
    ...[...inflow.entries()].map(([w, a])  => ({ wallet: w, amount: a, direction: 'in'  })),
    ...[...outflow.entries()].map(([w, a]) => ({ wallet: w, amount: a, direction: 'out' })),
  ].sort((a, b) => b.amount - a.amount);

  if (candidates.length === 0) return null;
  const winner = candidates[0];

  let solOut = 0, solIn = 0;
  for (const nt of nativeTransfers) {
    if (!nt) continue;
    const amount = Number(nt.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (nt.fromUserAccount === winner.wallet) solOut += amount;
    if (nt.toUserAccount   === winner.wallet) solIn  += amount;
  }
  const netSolOut = solOut - solIn;   // positive = wallet net-spent SOL → buy

  let type, solAmount;
  if (winner.direction === 'in' && netSolOut > 0) {
    type = 'BUY';      solAmount = netSolOut / 1e9;
  } else if (winner.direction === 'out' && netSolOut < 0) {
    type = 'SELL';     solAmount = Math.abs(netSolOut) / 1e9;
  } else if (winner.direction === 'out') {
    type = 'TRANSFER'; solAmount = 0;
  } else {
    type = 'RECEIVE';  solAmount = 0;
  }

  return {
    sig,
    timestamp: Number(tx.timestamp) || 0,
    type,
    source:    typeof tx.source === 'string' ? tx.source : null,
    wallet:    winner.wallet,
    basisAmount: winner.amount,
    solAmount,
  };
}

function renderSkeletonRows(tbody, count = 6) {
  tbody.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="mc-val loading">——</span></td>
      <td class="num"><span class="mc-val loading">——</span></td>
      <td class="num"><span class="mc-val loading">——</span></td>
      <td><span class="mc-val loading">——</span></td>
      <td><span class="mc-val loading">——</span></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderEmptyRow(tbody, message = 'No recent activity') {
  tbody.innerHTML = `<tr><td colspan="5" class="tx-empty">${message}</td></tr>`;
}

// Build a single activity row. All interpolated strings are pre-validated
// (sig/wallet) or pre-mapped (type/source). No untrusted on-chain string
// reaches innerHTML directly.
function buildActivityRow(act) {
  const tr = document.createElement('tr');
  tr.className = 'activity-row';
  tr.dataset.sig = act.sig;
  tr.tabIndex = 0;
  tr.setAttribute('role', 'link');
  tr.setAttribute('aria-label',
    `${act.type} ${fmtBasisAmount(act.basisAmount)} BASIS${act.solAmount > 0 ? ` for ${fmtSolAmount(act.solAmount)} SOL` : ''}, ${timeAgo(act.timestamp)}`
  );

  const typeCls = `tx-type type-${act.type.toLowerCase()}`;
  const rawSource = act.source ? (SOURCE_LABEL[act.source] ?? act.source.toLowerCase().replace(/_/g, ' ')) : '';
  // Sanitize source label one more time before innerHTML — defense in depth.
  const safeSource = rawSource.replace(/[^a-z0-9 .]/gi, '').slice(0, 16);

  tr.innerHTML = `
    <td>
      <span class="${typeCls}">${act.type}</span>
      ${safeSource ? `<span class="tx-source">${safeSource}</span>` : ''}
    </td>
    <td class="num amount-${act.type.toLowerCase()}">${fmtBasisAmount(act.basisAmount)}</td>
    <td class="num">${act.solAmount > 0 ? fmtSolAmount(act.solAmount) : '—'}</td>
    <td>
      <a class="tx-link wallet-link"
         href="https://orbmarkets.io/account/${act.wallet}"
         target="_blank" rel="noopener noreferrer"
         title="${act.wallet}">${shortAddr(act.wallet)}</a>
    </td>
    <td><span class="tx-time" title="${new Date(act.timestamp * 1000).toUTCString()}">${timeAgo(act.timestamp)}</span></td>
  `;

  // Whole-row click → solscan tx (bigger hit target, especially on mobile).
  // Wallet cell stops propagation so it goes to the account page instead.
  tr.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;       // honor inner link clicks
    window.open(`https://orbmarkets.io/tx/${act.sig}`, '_blank', 'noopener,noreferrer');
  });
  tr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(`https://orbmarkets.io/tx/${act.sig}`, '_blank', 'noopener,noreferrer');
    }
  });

  return tr;
}

// Track the most recent rendered sig so polling can highlight new rows
// (the "LIVE" status pill becomes earned, not aspirational).
let _lastTopSig = null;

async function fetchRecentTxs() {
  const tbody = document.getElementById('txTableBody');
  if (!tbody) return;

  if (!tbody.dataset.populated) {
    renderSkeletonRows(tbody, 6);
  }

  try {
    const url = heliusAddrTxsUrl(BASIS_MINT, { limit: 30 });
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const txs = await res.json();
    if (!Array.isArray(txs)) throw new Error('Unexpected response shape');

    const acts = txs.map(parseBasisActivity).filter(Boolean).slice(0, 12);

    if (acts.length === 0) {
      renderEmptyRow(tbody);
      return;
    }

    const newTopSig = acts[0].sig;
    const isPoll = !!tbody.dataset.populated;
    const previousSigs = isPoll
      ? new Set(Array.from(tbody.querySelectorAll('tr.activity-row')).map(r => r.dataset.sig))
      : new Set();

    tbody.innerHTML = '';
    for (const act of acts) {
      const row = buildActivityRow(act);
      // Highlight rows that didn't exist on the previous render — turns the
      // "LIVE" pill into earned signal.
      if (isPoll && !previousSigs.has(act.sig)) {
        row.classList.add('row-fresh');
        setTimeout(() => row.classList.remove('row-fresh'), 2400);
      }
      tbody.appendChild(row);
    }

    _lastTopSig = newTopSig;
    tbody.dataset.populated = '1';

  } catch (err) {
    console.warn('[terminal] fetchRecentTxs error:', err);
    if (!tbody.dataset.populated) {
      renderEmptyRow(tbody, 'Failed to load activity — retrying…');
    }
    // If we already have rows, keep them; the next poll will retry silently.
  }
}

/* ────────────────────────────────────────────────────────────
   Dashboard refresh
   ──────────────────────────────────────────────────────────── */

function initDashRefresh() {
  document.getElementById('dashRefresh')?.addEventListener('click', () => {
    fetchRecentTxs();
    window.dispatchEvent(new CustomEvent('refreshPrices'));
  });
}

/* ────────────────────────────────────────────────────────────
   Global search
   ──────────────────────────────────────────────────────────── */

function initGlobalSearch() {
  const input = document.getElementById('globalSearch');
  if (!input) return;

  // Enter key handler
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;

    const val = input.value.trim();
    if (!val) return;

    if (val.length >= 32 && val.length <= 44) {
      // Looks like a wallet/mint address — go to tools balance page
      window.location.href = `tools.html#balance?wallet=${encodeURIComponent(val)}`;
    } else {
      // Token symbol or partial — open DexScreener
      window.open(`https://dexscreener.com/solana/${encodeURIComponent(val)}`, '_blank', 'noopener,noreferrer');
    }
  });

  // Ctrl+K / Cmd+K global shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

/* ────────────────────────────────────────────────────────────
   Init
   ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSidebarToggle();
  initTimestamp();
  initBlockCounter();
  initChart();
  initPriceListener();
  initDashRefresh();
  initGlobalSearch();
  fetchRecentTxs();

  // Auto-refresh the activity feed every 60s. 100 credits per call × 60 polls
  // /hour = 6k credits/hour for an idle dashboard tab — fits comfortably in
  // the Free plan budget. We skip refresh while the tab is hidden to avoid
  // burning credits when nobody's looking. visibilitychange picks up the
  // refresh again as soon as the user returns.
  let pollTimer = setInterval(() => {
    if (!document.hidden) fetchRecentTxs();
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchRecentTxs();
  });
});
