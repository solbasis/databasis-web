// ─── BASIS On-Chain Tools ─────────────────────────────────────────────────────
import { BASIS_MINT, SOL_MINT, USDC_MINT, HELIUS_URL, HELIUS_TXS_URL } from './config.js';

const RPC_URL = HELIUS_URL;

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
const isValid = a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((a || '').trim());

function fmtSOL(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.0000 SOL';
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' SOL';
}

function fmtAmt(n, d = 2) {
  if (n === null || n === undefined || isNaN(n) || n === 0) return '0';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtUSD(n, sign = false) {
  if (n === null || n === undefined || isNaN(n)) return '$0.00';
  const abs = Math.abs(n);
  const s   = sign ? (n >= 0 ? '+$' : '-$') : (n < 0 ? '-$' : '$');
  if (abs >= 1e6) return s + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return s + (abs / 1e3).toFixed(2) + 'K';
  return s + abs.toFixed(abs < 0.001 ? 6 : 2);
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(p) {
  if (!p || isNaN(p)) return '$0';
  if (p < 0.0001) return '$' + p.toExponential(3);
  if (p < 0.001)  return '$' + p.toFixed(6);
  if (p < 1)      return '$' + p.toFixed(4);
  return '$' + p.toFixed(2);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pnlCls(v) { return v > 0.001 ? 'pnl-pos' : v < -0.001 ? 'pnl-neg' : 'pnl-neu'; }

function dateFromTs(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().split('T')[0];
}

function shortSig(sig) {
  if (!sig) return '—';
  return sig.slice(0, 6) + '…' + sig.slice(-4);
}

function fixUri(uri) {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return 'https://ipfs.io/ipfs/' + uri.slice(7);
  if (uri.startsWith('ar://'))   return 'https://arweave.net/' + uri.slice(5);
  return uri;
}

function getBestImg(asset) {
  const files = asset?.content?.files ?? [];
  for (const f of files) { if (f.cdn_uri) return f.cdn_uri; }
  if (files[0]?.uri) return fixUri(files[0].uri);
  const li = asset?.content?.links?.image;
  if (li) return fixUri(li);
  return null;
}

// ═══════════════════════════════════════════════════════
//  FETCH LOG
// ═══════════════════════════════════════════════════════
const logEl = document.getElementById('fetchLog');

function logClear() { logEl.innerHTML = ''; logEl.classList.remove('show'); }

function log(msg, type = 'ok') {
  logEl.classList.add('show');
  const ts   = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = document.createElement('span');
  line.className   = 'll ' + type;
  line.textContent = `[${ts}] ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ═══════════════════════════════════════════════════════
//  RPC HELPERS
// ═══════════════════════════════════════════════════════
let _reqId = 0;

async function rpcCall(method, params) {
  const id  = ++_reqId;
  const res = await fetch(RPC_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${method}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dasGetAsset(mint) {
  return rpcCall('getAsset', { id: mint, displayOptions: { showFungible: true } });
}

async function dasGetAssetsByOwner(owner) {
  const r = await rpcCall('getAssetsByOwner', {
    ownerAddress: owner, page: 1, limit: 1000,
    displayOptions: { showFungible: false, showNativeBalance: false }
  });
  return r?.items ?? [];
}

// ═══════════════════════════════════════════════════════
//  LIVE PRICES
// ═══════════════════════════════════════════════════════
let PRICE_BASIS = null;
let PRICE_SOL   = null;

async function loadPrices() {
  const [b, s] = await Promise.all([dasGetAsset(BASIS_MINT), dasGetAsset(SOL_MINT)]);
  PRICE_BASIS = b?.token_info?.price_info?.price_per_token ?? null;
  PRICE_SOL   = s?.token_info?.price_info?.price_per_token ?? null;
  log(`Live prices — SOL: $${PRICE_SOL?.toFixed(2) ?? 'N/A'}  ·  $BASIS: ${fmtPrice(PRICE_BASIS)}`);
}

// ═══════════════════════════════════════════════════════
//  TRADE STORE
// ═══════════════════════════════════════════════════════
let TRADES = [];

// ═══════════════════════════════════════════════════════
//  PNL ENGINE
// ═══════════════════════════════════════════════════════
function runPnl() {
  const sorted = [...TRADES].sort((a, b) => a.ts - b.ts);
  const buys   = sorted.filter(t => t.type === 'buy');
  const sells  = sorted.filter(t => t.type === 'sell');

  for (const t of TRADES) t._pnl = null;

  let realizedPnl = 0, wins = 0, losses = 0;
  const buyPool   = buys.map(t => ({ ...t }));

  for (const sell of sells) {
    let rem = sell.amount, cost = 0;
    while (rem > 0.0001 && buyPool.length) {
      const buy  = buyPool[0];
      const used = Math.min(buy.amount, rem);
      cost      += used * buy.priceUSD;
      buy.amount -= used;
      rem        -= used;
      if (buy.amount < 0.0001) buyPool.shift();
    }
    const pnl = sell.totalUSD - cost;
    realizedPnl += pnl;
    if (pnl >  0.01) wins++;
    else if (pnl < -0.01) losses++;
    const orig = TRADES.find(t => t.sig === sell.sig);
    if (orig) orig._pnl = pnl;
  }

  const totalBought   = buys.reduce((s, t) => s + t.amount, 0);
  const totalSold     = sells.reduce((s, t) => s + t.amount, 0);
  const heldAmt       = Math.max(0, totalBought - totalSold);
  const totalInvested = buys.reduce((s, t) => s + t.totalUSD, 0);

  let unrealizedPnl  = 0;
  let unrealizedNote = 'No open position';

  if (heldAmt > 0.001 && PRICE_BASIS !== null) {
    const remainingCost = buyPool.reduce((s, b) => s + (b.amount * b.priceUSD), 0);
    unrealizedPnl  = (heldAmt * PRICE_BASIS) - remainingCost;
    unrealizedNote = `${fmtAmt(heldAmt, 0)} $BASIS held`;
  } else if (heldAmt > 0.001) {
    unrealizedNote = `${fmtAmt(heldAmt, 0)} $BASIS held (price unavailable)`;
  }

  const totalPnl    = realizedPnl + unrealizedPnl;
  const totalClosed = sells.length;
  const roi         = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : null;
  const winRate     = totalClosed   > 0 ? (wins / totalClosed) * 100       : null;

  return { realizedPnl, unrealizedPnl, unrealizedNote, totalPnl, roi, wins, losses, totalClosed, winRate, totalInvested, heldAmt };
}

// ═══════════════════════════════════════════════════════
//  RENDER STATS
// ═══════════════════════════════════════════════════════
function setStat(id, val, cls = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  el.className   = 'stat-val' + (cls ? ' ' + cls : '');
}

function resetStats() {
  ['sRPnl', 'sUPnl', 'sRoi', 'sWin'].forEach(id => setStat(id, '—', 'idle'));
  document.getElementById('sWinSub').textContent  = 'W / L trades';
  document.getElementById('sUPnlSub').textContent = 'Open positions';
  document.getElementById('barMeta').textContent  = '—';
  document.getElementById('pnlBarFill').style.width = '0%';
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('lit'));
  document.getElementById('tradeCount').textContent = '0 trades found';
}

function renderStats() {
  if (!TRADES.length) { resetStats(); return; }
  const p = runPnl();

  setStat('sRPnl', fmtUSD(p.realizedPnl, true), p.realizedPnl >= 0 ? 'pos' : 'neg');

  if (PRICE_BASIS === null) {
    setStat('sUPnl', 'PRICE N/A', 'loading');
  } else {
    setStat('sUPnl', fmtUSD(p.unrealizedPnl, true), p.unrealizedPnl >= 0 ? 'pos' : 'neg');
  }
  document.getElementById('sUPnlSub').textContent = p.unrealizedNote;

  setStat('sRoi', fmtPct(p.roi), p.roi > 0 ? 'pos' : p.roi < 0 ? 'neg' : '');
  setStat('sWin', p.winRate !== null ? fmtPct(p.winRate) : '—');
  document.getElementById('sWinSub').textContent = `${p.wins}W / ${p.losses}L (${p.totalClosed} closed)`;

  if (p.totalInvested > 0) {
    const pct  = Math.min(Math.abs(p.totalPnl / p.totalInvested) * 100, 100);
    const fill = document.getElementById('pnlBarFill');
    fill.style.width = pct + '%';
    fill.className   = 'pnl-bar-fill ' + (p.totalPnl >= 0 ? 'pos' : 'neg');
    document.getElementById('barMeta').textContent =
      `Total PnL: ${fmtUSD(p.totalPnl, true)}  ·  Invested: ${fmtUSD(p.totalInvested)}`;
  }
  document.querySelectorAll('.stat-card').forEach(c => c.classList.add('lit'));
  document.getElementById('tradeCount').textContent =
    `${TRADES.length} trade${TRADES.length !== 1 ? 's' : ''} found`;
}

function renderTable() {
  const tb   = document.getElementById('tradeBody');
  const rows = [...TRADES].sort((a, b) => b.ts - a.ts);
  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="7"><div class="empty">NO $BASIS TRADES FOUND FOR THIS WALLET</div></td></tr>';
    return;
  }
  tb.innerHTML = rows.map(t => {
    const badge = t.type === 'buy'
      ? '<span class="badge b-buy">BUY</span>'
      : '<span class="badge b-sell">SELL</span>';
    const pnlHtml = t.type === 'buy'
      ? '<span class="pnl-neu">OPEN</span>'
      : t._pnl !== null && t._pnl !== undefined
        ? `<span class="${pnlCls(t._pnl)}">${fmtUSD(t._pnl, true)}</span>`
        : '<span class="pnl-neu">—</span>';
    const txLink = t.sig
      ? `<a href="https://orbmarkets.io/tx/${esc(t.sig)}" target="_blank" rel="noopener noreferrer" style="color:var(--text-dim);text-decoration:none;font-size:0.70rem;" title="${esc(t.sig)}">${shortSig(t.sig)}</a>`
      : '—';
    return `<tr>
      <td>${badge}</td>
      <td>${fmtAmt(t.amount, 2)}</td>
      <td>${fmtPrice(t.priceUSD)}</td>
      <td>${fmtUSD(t.totalUSD)}</td>
      <td>${pnlHtml}</td>
      <td>${esc(t.date)}</td>
      <td>${txLink}</td>
    </tr>`;
  }).join('');
}

function renderAll() { renderStats(); renderTable(); }

// ═══════════════════════════════════════════════════════
//  PARSE ENHANCED TX
// ═══════════════════════════════════════════════════════
function parseEnhancedTx(tx, walletAddr) {
  if (!tx || tx.transactionError) return null;

  const sig  = tx.signature ?? null;
  const ts   = tx.timestamp ?? 0;
  const date = dateFromTs(ts);

  const transfers = tx.tokenTransfers ?? [];
  let basisIn = 0, basisOut = 0;

  for (const t of transfers) {
    if (t.mint !== BASIS_MINT) continue;
    const amt = Number(t.tokenAmount) || 0;
    if (t.toUserAccount   === walletAddr) basisIn  += amt;
    if (t.fromUserAccount === walletAddr) basisOut += amt;
  }

  const basisDelta = basisIn - basisOut;
  if (Math.abs(basisDelta) < 0.001) return null;

  let totalUSD = 0;

  let usdcIn = 0, usdcOut = 0;
  for (const t of transfers) {
    if (t.mint !== USDC_MINT) continue;
    const amt = Number(t.tokenAmount) || 0;
    if (t.toUserAccount   === walletAddr) usdcIn  += amt;
    if (t.fromUserAccount === walletAddr) usdcOut += amt;
  }
  const usdcDelta = usdcOut - usdcIn;
  if (Math.abs(usdcDelta) > 0.001) totalUSD = Math.abs(usdcDelta);

  if (totalUSD === 0) {
    const native = tx.nativeTransfers ?? [];
    let solIn = 0, solOut = 0;
    for (const n of native) {
      const amt = (Number(n.amount) || 0) / 1e9;
      if (n.toUserAccount   === walletAddr) solIn  += amt;
      if (n.fromUserAccount === walletAddr) solOut += amt;
    }
    const solNet = basisDelta > 0 ? (solOut - solIn) : (solIn - solOut);
    if (solNet > 0.000001 && PRICE_SOL) totalUSD = solNet * PRICE_SOL;
  }

  if (totalUSD === 0 && PRICE_SOL) {
    const acctData = tx.accountData ?? [];
    for (const a of acctData) {
      if (a.account !== walletAddr) continue;
      const solChange = (Number(a.nativeBalanceChange) || 0) / 1e9;
      if (Math.abs(solChange) > 0.000001) { totalUSD = Math.abs(solChange) * PRICE_SOL; break; }
    }
  }

  if (totalUSD === 0 && PRICE_BASIS) totalUSD = Math.abs(basisDelta) * PRICE_BASIS;

  const amount   = Math.abs(basisDelta);
  const priceUSD = amount > 0 ? totalUSD / amount : (PRICE_BASIS ?? 0);
  const type     = basisDelta > 0 ? 'buy' : 'sell';

  return { sig, type, amount, priceUSD, totalUSD, date, ts };
}

// ═══════════════════════════════════════════════════════
//  PERFORMANCE MONITOR
// ═══════════════════════════════════════════════════════
document.getElementById('pnlBtn').addEventListener('click', async () => {
  const addr = document.getElementById('pnlWallet').value.trim();
  if (!addr) return;
  if (!isValid(addr)) { log('Invalid Solana address format.', 'err'); return; }

  const btn    = document.getElementById('pnlBtn');
  const status = document.getElementById('pnlStatus');

  btn.disabled = true;
  status.textContent = 'ANALYZING';
  status.classList.add('live');
  TRADES = [];
  logClear();
  resetStats();

  try {
    log('Fetching live $BASIS and SOL prices via Helius DAS…');
    await loadPrices();

    log('Locating $BASIS token accounts for this wallet…');
    const tokenAcctsResult = await rpcCall('getTokenAccountsByOwner', [
      addr,
      { mint: BASIS_MINT },
      { encoding: 'jsonParsed', commitment: 'finalized' }
    ]);

    const basisAccounts = (tokenAcctsResult?.value ?? []).map(a => a.pubkey);

    if (!basisAccounts.length) {
      log('No $BASIS token account found. Wallet has never held $BASIS.', 'warn');
      status.textContent = 'NO DATA'; status.classList.remove('live');
      btn.disabled = false; renderAll(); return;
    }

    log(`Found ${basisAccounts.length} $BASIS token account(s): ${basisAccounts.map(a => a.slice(0, 8) + '…').join(', ')}`);

    log('Fetching all $BASIS transaction signatures…');
    let allSigs = [];

    for (const acct of basisAccounts) {
      let before = undefined;
      while (true) {
        const params = [acct, { limit: 1000, commitment: 'finalized', ...(before ? { before } : {}) }];
        const batch  = await rpcCall('getSignaturesForAddress', params);
        if (!batch || !batch.length) break;
        const good = batch.filter(s => s.err === null).map(s => s.signature);
        allSigs = allSigs.concat(good);
        if (batch.length < 1000) break;
        before = batch[batch.length - 1].signature;
        await delay(60);
      }
    }

    allSigs = [...new Set(allSigs)];
    log(`Found ${allSigs.length} $BASIS transaction(s) to parse.`);

    if (!allSigs.length) {
      log('No successful $BASIS transactions found.', 'warn');
      status.textContent = 'NO DATA'; status.classList.remove('live');
      btn.disabled = false; renderAll(); return;
    }

    log('Fetching enhanced transaction details…');
    const CHUNK    = 100;
    const PARALLEL = 3;
    let   tokCount = 0;
    let   fetched  = 0;

    const chunks = [];
    for (let i = 0; i < allSigs.length; i += CHUNK) chunks.push(allSigs.slice(i, i + CHUNK));

    for (let i = 0; i < chunks.length; i += PARALLEL) {
      const window  = chunks.slice(i, i + PARALLEL);
      const fetches = window.map(sigs =>
        fetch(HELIUS_TXS_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ transactions: sigs })
        })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
      );

      const results = await Promise.all(fetches);

      for (const txs of results) {
        if (!Array.isArray(txs)) continue;
        fetched += txs.length;
        for (const tx of txs) {
          const trade = parseEnhancedTx(tx, addr);
          if (trade && !TRADES.find(t => t.sig === trade.sig)) {
            TRADES.push(trade); tokCount++;
          }
        }
      }

      const done = Math.min((i + PARALLEL) * CHUNK, allSigs.length);
      log(`Parsed ${done}/${allSigs.length} — ${tokCount} $BASIS trade(s) found…`);

      if (tokCount > 0) { TRADES.sort((a, b) => a.ts - b.ts); renderAll(); }
      if (i + PARALLEL < chunks.length) await delay(80);
    }

    if (!tokCount) {
      log(`No $BASIS trades found in ${fetched} transactions.`, 'warn');
    } else {
      TRADES.sort((a, b) => a.ts - b.ts);
      log(`Done. ${tokCount} $BASIS trade(s) found across ${fetched} transaction(s).`, 'ok');
    }

    renderAll();
    status.textContent = tokCount ? 'DONE' : 'NO DATA';

  } catch (err) {
    log('Error: ' + err.message, 'err');
    status.textContent = 'ERROR';
    console.error('[pnl]', err);
  } finally {
    status.classList.remove('live');
    btn.disabled = false;
  }
});

// ═══════════════════════════════════════════════════════
//  CLEAR & EXPORT
// ═══════════════════════════════════════════════════════
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!TRADES.length || confirm('Clear all trade data?')) {
    TRADES = [];
    resetStats();
    renderAll();
    logClear();
    document.getElementById('pnlStatus').textContent = 'READY';
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!TRADES.length) return;
  runPnl();
  const hdr  = 'Type,Amount ($BASIS),Price (USD),Total (USD),Realized PnL (USD),Date,Signature\n';
  const rows = [...TRADES]
    .sort((a, b) => a.ts - b.ts)
    .map(t => [
      t.type, t.amount, t.priceUSD.toFixed(8), t.totalUSD.toFixed(4),
      t._pnl !== null && t._pnl !== undefined ? t._pnl.toFixed(4) : '',
      t.date, t.sig || ''
    ].join(','))
    .join('\n');
  const blob = new Blob([hdr + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'basis-trades.csv' });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
});

// ═══════════════════════════════════════════════════════
//  BALANCE CHECKER
// ═══════════════════════════════════════════════════════
async function checkBalance() {
  const addr  = document.getElementById('balWallet').value.trim();
  if (!addr) return;
  const resEl = document.getElementById('balResult');
  const stsEl = document.getElementById('balStatus');
  const btn   = document.getElementById('balBtn');

  if (!isValid(addr)) {
    resEl.className = 'rbox err';
    resEl.innerHTML = '⚠ Invalid Solana address format.';
    return;
  }

  btn.disabled      = true;
  stsEl.textContent = 'FETCHING';
  resEl.className   = 'rbox';
  resEl.innerHTML   = `<span class="spin"></span><span style="font-size:0.80rem;letter-spacing:1px;">QUERYING ON-CHAIN…</span>`;

  try {
    if (PRICE_SOL === null || PRICE_BASIS === null) await loadPrices().catch(() => {});

    const [balResult, tokenAccts] = await Promise.all([
      rpcCall('getBalance', [addr, { commitment: 'confirmed' }]),
      rpcCall('getTokenAccountsByOwner', [addr, { mint: BASIS_MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }])
    ]);

    const lamports = balResult?.value ?? balResult ?? 0;
    const solBal   = Number(lamports) / 1e9;

    let basisBal = 0;
    const accts  = tokenAccts?.value ?? [];
    for (const a of accts) basisBal += a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;

    const solUsdStr   = PRICE_SOL   ? ` <span style="color:var(--text-dim);font-size:0.72rem;">≈ ${fmtUSD(solBal * PRICE_SOL)}</span>`   : '';
    const basisUsdStr = PRICE_BASIS && basisBal > 0 ? ` <span style="color:var(--text-dim);font-size:0.72rem;">≈ ${fmtUSD(basisBal * PRICE_BASIS)}</span>` : '';

    resEl.className = 'rbox ok';
    resEl.innerHTML = `
      <div class="kv">
        <div class="kv-row"><span class="kv-k">WALLET</span><span class="kv-v" style="font-size:0.68rem;">${esc(addr)}</span></div>
        <div class="kv-row"><span class="kv-k">SOL BALANCE</span><span class="kv-v">${fmtSOL(solBal)}${solUsdStr}</span></div>
        <div class="kv-row"><span class="kv-k">$BASIS BALANCE</span><span class="kv-v">${fmtAmt(basisBal, 2)} $BASIS${basisUsdStr}</span></div>
        <div class="kv-row"><span class="kv-k">TOKEN ACCOUNTS</span><span class="kv-v">${accts.length > 0 ? accts.length + ' found' : 'None'}</span></div>
      </div>`;
    stsEl.textContent = 'DONE';

  } catch (err) {
    resEl.className = 'rbox err';
    resEl.innerHTML = `⚠ ${esc(err.message || 'RPC error — check connection')}`;
    stsEl.textContent = 'ERROR';
    console.error('[balance]', err);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('balBtn').addEventListener('click', checkBalance);
document.getElementById('balWallet').addEventListener('keydown', e => { if (e.key === 'Enter') checkBalance(); });

// ═══════════════════════════════════════════════════════
//  NFT HOLDER CHECKER
// ═══════════════════════════════════════════════════════
async function checkNFTs() {
  const addr   = document.getElementById('nftWallet').value.trim();
  if (!addr) return;
  const resEl  = document.getElementById('nftResult');
  const gridEl = document.getElementById('nftGrid');
  const stsEl  = document.getElementById('nftStatus');
  const btn    = document.getElementById('nftBtn');

  if (!isValid(addr)) {
    resEl.className = 'rbox err';
    resEl.innerHTML = '⚠ Invalid Solana address format.';
    return;
  }

  btn.disabled         = true;
  stsEl.textContent    = 'SCANNING';
  resEl.className      = 'rbox';
  resEl.innerHTML      = `<span class="spin"></span><span style="font-size:0.80rem;letter-spacing:1px;">SCANNING NFTs…</span>`;
  gridEl.style.display = 'none';
  gridEl.innerHTML     = '';

  try {
    const all       = await dasGetAssetsByOwner(addr);
    const basisNFTs = all.filter(a => (a.content?.metadata?.name || '').toLowerCase().includes('basis'));
    const total     = all.length;
    const found     = basisNFTs.length;

    if (found === 0) {
      resEl.className = 'rbox ok';
      resEl.innerHTML = `
        <div style="font-size:0.68rem;letter-spacing:1.8px;color:var(--text-dim);margin-bottom:5px;">SCAN RESULT</div>
        <div style="font-size:1.0rem;font-weight:600;color:var(--warn);">0 BASIS GENESIS NFTs FOUND</div>
        <div style="font-size:0.72rem;color:var(--text-dim);margin-top:4px;">Wallet holds ${total.toLocaleString()} total NFT(s) — none matched BASIS Genesis.</div>`;
    } else {
      resEl.className = 'rbox ok';
      resEl.innerHTML = `
        <div style="font-size:0.68rem;letter-spacing:1.8px;color:var(--text-dim);margin-bottom:5px;">SCAN RESULT</div>
        <div style="font-size:1.0rem;font-weight:600;color:var(--pos);">✓ ${found} BASIS GENESIS NFT${found > 1 ? 's' : ''} FOUND</div>
        <div style="font-size:0.72rem;color:var(--text-dim);margin-top:4px;">Out of ${total.toLocaleString()} total NFT(s) in this wallet.</div>`;

      gridEl.style.display = 'grid';

      for (const nft of basisNFTs) {
        const name = nft.content?.metadata?.name ?? 'BASIS NFT';
        const img  = getBestImg(nft);
        const card = document.createElement('div');
        card.className = 'nft-card';

        if (img) {
          const imgEl     = document.createElement('img');
          imgEl.className = 'nft-img';
          imgEl.alt       = name;
          imgEl.loading   = 'lazy';
          imgEl.src       = img;

          const ph         = document.createElement('div');
          ph.className     = 'nft-ph';
          ph.style.display = 'none';
          ph.textContent   = 'NO IMG';

          imgEl.onerror = () => {
            imgEl.style.display = 'none';
            ph.style.display    = 'flex';
            const ju = nft.content?.json_uri;
            if (ju) {
              fetch(ju).then(r => r.json()).then(d => {
                const src = fixUri(d.image);
                if (src) {
                  const img2   = imgEl.cloneNode();
                  img2.src     = src;
                  img2.onerror = () => { img2.remove(); ph.style.display = 'flex'; };
                  img2.onload  = () => { ph.style.display = 'none'; };
                  card.insertBefore(img2, ph);
                }
              }).catch(() => {});
            }
          };

          const nameEl       = document.createElement('div');
          nameEl.className   = 'nft-name';
          nameEl.textContent = name;

          card.appendChild(imgEl);
          card.appendChild(ph);
          card.appendChild(nameEl);

        } else {
          const ph           = document.createElement('div');
          ph.className       = 'nft-ph';
          ph.textContent     = 'LOADING';
          const nameEl       = document.createElement('div');
          nameEl.className   = 'nft-name';
          nameEl.textContent = name;
          card.appendChild(ph);
          card.appendChild(nameEl);

          const ju = nft.content?.json_uri;
          if (ju) {
            fetch(ju).then(r => r.json()).then(d => {
              const src = fixUri(d.image);
              if (src) {
                const imgEl     = document.createElement('img');
                imgEl.className = 'nft-img';
                imgEl.alt       = name;
                imgEl.loading   = 'lazy';
                imgEl.src       = src;
                imgEl.onerror   = () => { imgEl.remove(); ph.textContent = 'NO IMG'; ph.style.display = 'flex'; };
                imgEl.onload    = () => { ph.style.display = 'none'; };
                card.insertBefore(imgEl, ph);
              } else { ph.textContent = 'NO IMG'; }
            }).catch(() => { ph.textContent = 'NO IMG'; });
          } else { ph.textContent = 'NO IMG'; }
        }

        gridEl.appendChild(card);
      }
    }
    stsEl.textContent = 'DONE';

  } catch (err) {
    resEl.className      = 'rbox err';
    resEl.innerHTML      = `⚠ ${esc(err.message || 'DAS error')}`;
    stsEl.textContent    = 'ERROR';
    gridEl.style.display = 'none';
    console.error('[nft]', err);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('nftBtn').addEventListener('click', checkNFTs);
document.getElementById('nftWallet').addEventListener('keydown', e => { if (e.key === 'Enter') checkNFTs(); });
