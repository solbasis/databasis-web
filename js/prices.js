// ─── Live Prices Section ─────────────────────────────────────────────────────
import { BASIS_MINT, SOL_MINT, BASIS_SUPPLY, HELIUS_KEY, HELIUS_URL } from './config.js';

const DEX_URL = `https://api.dexscreener.com/tokens/v1/solana/${BASIS_MINT},${SOL_MINT}`;
const JUP_URL = `https://lite-api.jup.ag/price/v2?ids=${BASIS_MINT},${SOL_MINT}`;

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtNum(n, d = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtUSD(n) {
  if (!n || isNaN(n)) return '$—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(4);
}

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Source 1: DexScreener ─────────────────────────────────────────────────────
async function fetchDexScreener() {
  const r = await fetch(DEX_URL);
  if (!r.ok) throw new Error(`DexScreener HTTP ${r.status}`);
  const data  = await r.json();
  const pairs = Array.isArray(data) ? data : (data.pairs ?? []);

  let solPrice = null, basisPrice = null;
  let solVol   = 0,   basisVol   = 0;
  let basisLiq = null, basisChange24h = null;

  for (const pair of pairs) {
    const base  = pair.baseToken?.address ?? '';
    const quote = pair.quoteToken?.address ?? '';
    const price = parseFloat(pair.priceUsd);
    if (!price || isNaN(price)) continue;
    const vol = pair.volume?.h24 ?? 0;

    if (base === BASIS_MINT || quote === BASIS_MINT) {
      const p = base === BASIS_MINT ? price : 1 / price;
      if (vol > basisVol) {
        basisPrice     = p;
        basisVol       = vol;
        basisLiq       = pair.liquidity?.usd ?? null;
        basisChange24h = pair.priceChange?.h24 ?? null;
      }
    }
    if (base === SOL_MINT || quote === SOL_MINT) {
      const p = base === SOL_MINT ? price : 1 / price;
      if (vol > solVol) { solPrice = p; solVol = vol; }
    }
  }

  return { sol: solPrice, basis: basisPrice, basisVol, basisLiq, basisChange24h };
}

// ── Source 2: Jupiter (fallback) ──────────────────────────────────────────────
async function fetchJupiter() {
  const r = await fetch(JUP_URL);
  if (!r.ok) throw new Error(`Jupiter HTTP ${r.status}`);
  const d = await r.json();
  return {
    sol:   parseFloat(d?.data?.[SOL_MINT]?.price)   || null,
    basis: parseFloat(d?.data?.[BASIS_MINT]?.price) || null,
  };
}

// ── Source 3: Helius DAS (second fallback) ────────────────────────────────────
async function fetchHeliusDAS(mint) {
  const r = await fetch(HELIUS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      jsonrpc: '2.0', id: 'p', method: 'getAsset',
      params: { id: mint, displayOptions: { showFungible: true } },
    }),
  });
  if (!r.ok) throw new Error(`Helius DAS HTTP ${r.status}`);
  const d = await r.json();
  return d?.result?.token_info?.price_info?.price_per_token ?? null;
}

// ── Set card state (legacy DOM elements) ──────────────────────────────────────
function setCard(id, text, state = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = 'pc-val' + (state ? ' ' + state : '');
}

// ── Main fetch: waterfall through 3 sources ───────────────────────────────────
async function fetchPrices() {
  const statusEl = document.getElementById('tickerStatus');
  const updateEl = document.getElementById('lastUpdate');

  if (statusEl) {
    statusEl.textContent = 'FETCHING';
    statusEl.classList.remove('live');
  }

  setCard('solPrice',   'LOADING', 'loading');
  setCard('basisPrice', 'LOADING', 'loading');
  setCard('basisMcap',  'LOADING', 'loading');

  let solPrice = null, basisPrice = null;
  let basisVol = 0, basisLiq = null, basisChange24h = null;

  try {
    // Source 1: DexScreener
    try {
      const dex = await fetchDexScreener();
      solPrice       = dex.sol;
      basisPrice     = dex.basis;
      basisVol       = dex.basisVol ?? 0;
      basisLiq       = dex.basisLiq;
      basisChange24h = dex.basisChange24h;
    } catch (e) { console.warn('[prices] DexScreener:', e.message); }

    // Source 2: Jupiter (fill gaps)
    if (solPrice === null || basisPrice === null) {
      try {
        const jup = await fetchJupiter();
        if (solPrice   === null) solPrice   = jup.sol;
        if (basisPrice === null) basisPrice = jup.basis;
      } catch (e) { console.warn('[prices] Jupiter:', e.message); }
    }

    // Source 3: Helius DAS (fill remaining gaps)
    if (solPrice === null || basisPrice === null) {
      try {
        const [s, b] = await Promise.all([
          solPrice   === null ? fetchHeliusDAS(SOL_MINT)   : Promise.resolve(null),
          basisPrice === null ? fetchHeliusDAS(BASIS_MINT) : Promise.resolve(null),
        ]);
        if (solPrice   === null) solPrice   = s;
        if (basisPrice === null) basisPrice = b;
      } catch (e) { console.warn('[prices] Helius DAS:', e.message); }
    }

    // ── Render legacy price cards (old index layout) ──────────────────────────
    setCard('solPrice',   solPrice   ? `$${fmtNum(solPrice, 2)}` : 'N/A', solPrice   ? '' : 'err');
    setCard('basisPrice', basisPrice ? `$${basisPrice < 0.001 ? basisPrice.toFixed(8) : fmtNum(basisPrice, 6)}` : 'N/A', basisPrice ? '' : 'err');
    setCard('basisMcap',  basisPrice ? fmtUSD(basisPrice * BASIS_SUPPLY) : 'N/A', basisPrice ? '' : 'err');

    document.querySelectorAll('.price-card').forEach(c => c.classList.add('lit'));

    if (statusEl) {
      statusEl.textContent = 'LIVE';
      statusEl.classList.add('live');
    }
    if (updateEl) updateEl.textContent = `Last update: ${nowStr()}`;

    // ── Dispatch event for terminal dashboard ─────────────────────────────────
    window.dispatchEvent(new CustomEvent('basisPriceUpdate', {
      detail: {
        basisPrice,
        solPrice,
        mcap:          basisPrice ? basisPrice * BASIS_SUPPLY : null,
        vol24h:        basisVol || null,
        liq:           basisLiq,
        priceChange24h: basisChange24h,
      },
    }));

  } catch (err) {
    if (statusEl) statusEl.textContent = 'ERROR';
    ['solPrice', 'basisPrice', 'basisMcap'].forEach(id => setCard(id, 'ERR', 'err'));
    if (updateEl) updateEl.textContent = `Failed ${nowStr()} — ${err.message}`;
    console.error('[prices]', err);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPrices() {
  fetchPrices();
  setInterval(fetchPrices, 60_000);

  // Legacy refresh button (old layout)
  document.getElementById('refreshBtn')?.addEventListener('click', fetchPrices);

  // Terminal dashboard refresh trigger
  window.addEventListener('refreshPrices', fetchPrices);
}
