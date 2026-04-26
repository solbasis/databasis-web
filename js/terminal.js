/**
 * terminal.js — Shell logic for Databasis crypto terminal
 * Side-effects only module; no exports.
 */

import { BASIS_MINT, HELIUS_URL, HELIUS_TXS_URL, BASIS_SUPPLY, DEX_LINK } from './config.js';

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

// The dashboard's recent-activity table has 4 columns: TX HASH, SLOT,
// STATUS, TIME. The TX HASH cell already wraps the signature in a Solscan
// link so we don't need a separate explorer-link column.
function renderSkeletonRows(tbody, count = 5) {
  tbody.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="mc-val loading">——</span></td>
      <td><span class="mc-val loading">——</span></td>
      <td><span class="mc-val loading">——</span></td>
      <td><span class="mc-val loading">——</span></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderEmptyRow(tbody, message = 'No transactions found') {
  tbody.innerHTML = `<tr><td colspan="4" class="tx-empty">${message}</td></tr>`;
}

async function fetchRecentTxs() {
  // The HTML table puts its id on the <tbody> directly, not the <table>.
  // (Earlier refactor missed updating this selector — symptom was the
  // dashboard sitting on "LOADING…" forever because the early-return
  // fired and the skeleton/data-render path never ran.)
  const tbody = document.getElementById('txTableBody');
  if (!tbody) return;

  renderSkeletonRows(tbody, 5);

  try {
    const res = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [BASIS_MINT, { limit: 20 }],
      }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const sigs  = data?.result;

    if (!sigs || sigs.length === 0) {
      renderEmptyRow(tbody);
      return;
    }

    tbody.innerHTML = '';

    sigs.slice(0, 20).forEach(tx => {
      const sig   = tx.signature ?? '';
      const slot  = tx.slot      ?? '—';
      const btime = tx.blockTime;
      const err   = tx.err;

      const shortSig  = sig.length >= 8 ? sig.slice(0, 4) + '…' + sig.slice(-4) : sig;
      const timeStr   = btime ? timeAgo(btime) : '—';
      const statusStr = err ? '✗' : '✓';
      const statusCls = err ? 'type-sell' : 'type-buy';

      const tr = document.createElement('tr');
      // Column order matches the table headers: TX HASH, SLOT, STATUS, TIME.
      // TX HASH is the explorer link so a separate ↗ column would be redundant.
      tr.innerHTML = `
        <td>
          <a class="tx-link" href="https://solscan.io/tx/${sig}" target="_blank" rel="noopener noreferrer">${shortSig}</a>
        </td>
        <td>${Number(slot).toLocaleString()}</td>
        <td class="${statusCls}">${statusStr}</td>
        <td>${timeStr}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.warn('[terminal] fetchRecentTxs error:', err);
    renderEmptyRow(tbody, 'Failed to load transactions');
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
});
