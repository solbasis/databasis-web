// ─── BASIS Holder Map ──────────────────────────────────────────────────────
'use strict';

import { BASIS_MINT, BASIS_SUPPLY, HELIUS_URL } from './config.js';

const MINT   = BASIS_MINT;
const SUPPLY = BASIS_SUPPLY;
const RPC    = HELIUS_URL;

const KNOWN = {
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg': { name: 'Pump.fun (BASIS) Bonding Curve', tag: 'BONDING CURVE' }
};
function getKnown(o, a, r) {
  if (KNOWN[o]) return KNOWN[o];
  if (r === 0 && a >= 6e8) return { name: 'Pump.fun (BASIS) Bonding Curve', tag: 'BONDING CURVE' };
  return null;
}

const TIERS = [
  { id: 'whale',  label: 'Whale',    min: 1e7,  max: Infinity, color: '#78b15a', bright: 1    },
  { id: 'shark',  label: 'Shark',    min: 1e6,  max: 1e7,      color: '#92b84a', bright: .80  },
  { id: 'dolphin',label: 'Dolphin',  min: 1e5,  max: 1e6,      color: '#b5b83e', bright: .62  },
  { id: 'fish',   label: 'Fish',     min: 1e4,  max: 1e5,      color: '#c9a436', bright: .46  },
  { id: 'shrimp', label: 'Shrimp',   min: 1e3,  max: 1e4,      color: '#d4803a', bright: .32  },
  { id: 'plank',  label: 'Plankton', min: 1,    max: 1e3,      color: '#d9603e', bright: .18  },
  { id: 'dust',   label: 'Dust',     min: 0,    max: 1,        color: '#e05050', bright: .08  },
];
function tier(a) { return TIERS.find(t => a >= t.min && a < t.max) || TIERS[6]; }

/* ═══ STATE ═══ */
let ALL = [], SQ = [], tx = 0, ty = 0, sc = 1;
let hovered = null, locked = null;
let searchSet = new Set(), muted = new Set();
let loaded = false, pixPat = null;
let tTx = 0, tTy = 0, tSc = 1, animating = false;
let ripples = [];
let t0 = performance.now();
let dragNode = null, dragOff = null;
let dragging = false;

/* ═══ HELPERS ═══ */
function fA(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(3) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(3) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
function fP(n)    { return (n * 100).toFixed(4) + '%'; }
function sh(a)    { return a ? a.slice(0, 6) + '…' + a.slice(-4) : '—'; }
function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function toW(sx, sy)   { return { x: (sx - tx) / sc, y: (sy - ty) / sc }; }
function now()    { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function lerp(a, b, t) { return a + (b - a) * t; }

function gF(b, a)  { const r = Math.round(18 + (140 - 18) * b), g = Math.round(44 + (212 - 44) * b), bl = Math.round(14 + (98 - 14) * b); return `rgba(${r},${g},${bl},${a || .80})`; }
function gFH(b)    { const r = Math.round(55 + (185 - 55) * b), g = Math.round(95 + (245 - 95) * b), bl = Math.round(35 + (135 - 35) * b); return `rgb(${r},${g},${bl})`; }
function gB(b)     { return `rgba(${Math.round(45 + (195 - 45) * b)},${Math.round(85 + (255 - 85) * b)},${Math.round(30 + (145 - 30) * b)},.45)`; }
function gG(b)     { return `rgba(${Math.round(55 + (175 - 55) * b)},${Math.round(95 + (245 - 95) * b)},${Math.round(35 + (135 - 35) * b)},.6)`; }

/* ═══ SMOOTH ZOOM ═══ */
function animateTo(ntx, nty, nsc) { tTx = ntx; tTy = nty; tSc = nsc; animating = true; }
function tickAnim() {
  if (!animating) return;
  const spd = 0.14;
  tx = lerp(tx, tTx, spd); ty = lerp(ty, tTy, spd); sc = lerp(sc, tSc, spd);
  if (Math.abs(tx - tTx) < .5 && Math.abs(ty - tTy) < .5 && Math.abs(sc - tSc) < .001) {
    tx = tTx; ty = tTy; sc = tSc; animating = false;
  }
}

/* ═══ RIPPLE ═══ */
function addRipple(wx, wy, maxR) { ripples.push({ x: wx, y: wy, t0: performance.now(), maxR: maxR || 60, dur: 600 }); }

/* ═══ PARTICLES ═══ */
let particles = [];
const MAX_PARTICLES = 300;

function initParticles() {
  particles = [];
  if (!SQ.length) return;
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for (const s of SQ) { mnX = Math.min(mnX, s.x); mnY = Math.min(mnY, s.y); mxX = Math.max(mxX, s.x + s.size); mxY = Math.max(mxY, s.y + s.size); }
  const pad = 150; mnX -= pad; mnY -= pad; mxX += pad; mxY += pad;
  const bw = mxX - mnX, bh = mxY - mnY;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const r = Math.random();
    let sz, spd, al;
    if (r < .60)       { sz = .8 + Math.random() * 1.5; spd = .08 + Math.random() * .14; al = .06 + Math.random() * .12; }
    else if (r < .90)  { sz = 2 + Math.random() * 2.5;  spd = .03 + Math.random() * .07; al = .10 + Math.random() * .18; }
    else               { sz = 3.5 + Math.random() * 3;  spd = .01 + Math.random() * .03; al = .12 + Math.random() * .22; }
    const angle = Math.random() * Math.PI * 2;
    particles.push({ x: mnX + Math.random() * bw, y: mnY + Math.random() * bh, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, sz, baseAlpha: al, alpha: al, drift: Math.random() * Math.PI * 2, pulse: Math.random() * Math.PI * 2, pulseSpd: .3 + Math.random() * .8, mnX, mnY, mxX, mxY });
  }
}

function tickParticles() {
  const t = performance.now() / 1000;
  for (const p of particles) {
    p.x += p.vx + Math.sin(t * .5 + p.drift) * .025;
    p.y += p.vy + Math.cos(t * .4 + p.drift) * .025;
    p.alpha = p.baseAlpha * (.6 + Math.sin(t * p.pulseSpd + p.pulse) * .4);
    if (p.x < p.mnX) p.x = p.mxX; if (p.x > p.mxX) p.x = p.mnX;
    if (p.y < p.mnY) p.y = p.mxY; if (p.y > p.mxY) p.y = p.mnY;
  }
}

/* ═══ PHYSICS REPULSION ═══ */
function tickPhysics() {
  if (!dragging || !dragNode) return;
  const d = dragNode;
  const dcx = d.x + d.size / 2, dcy = d.y + d.size / 2;
  const pushRadius = d.size + 60;
  for (const s of SQ) {
    if (s === d || muted.has(s.tier.id)) continue;
    const scx = s.x + s.size / 2, scy = s.y + s.size / 2;
    const dx = scx - dcx, dy = scy - dcy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const minDist = (d.size + s.size) / 2 + 4;
    if (dist < pushRadius) {
      const strength = cl((1 - dist / pushRadius), 0, 1) * 0.8;
      const nx = dx / dist, ny = dy / dist;
      s.vx = (s.vx || 0) + nx * strength;
      s.vy = (s.vy || 0) + ny * strength;
      if (dist < minDist) { const overlap = minDist - dist; s.x += nx * overlap * .4; s.y += ny * overlap * .4; }
    }
  }
  for (const s of SQ) {
    if (s === d) continue;
    if (s.vx || s.vy) {
      s.x += (s.vx || 0); s.y += (s.vy || 0);
      s.vx *= .80; s.vy *= .80;
      if (Math.abs(s.vx) < .008) s.vx = 0;
      if (Math.abs(s.vy) < .008) s.vy = 0;
    }
  }
}

/* ═══ WHALE BADGE ═══ */
function getTop10() {
  if (!SQ.length) return [];
  const visibleOwners = new Set(SQ.map(s => s.owner));
  const top = ALL.filter(h => visibleOwners.has(h.owner)).slice(0, 10);
  return top.map(h => SQ.find(s => s.owner === h.owner)).filter(Boolean);
}

/* ═══ PROGRESS / TOAST ═══ */
function setOv(p, l, ph) {
  document.getElementById('ovFill').style.width = p + '%';
  document.getElementById('ovPct').textContent = Math.round(p) + '%';
  if (l !== undefined) document.getElementById('ovLabel').textContent = l;
  if (ph !== undefined) document.getElementById('ovPhase').textContent = ph;
}
function hideOv() { document.getElementById('overlay').classList.add('hide'); }

let _tt;
function toast(m, t = 'ok', d = 3500) {
  const e = document.getElementById('toast');
  e.textContent = m;
  e.className = `toast show ${t}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => e.classList.remove('show'), d);
}

/* ═══ FETCH ═══ */
async function fetchAll() {
  const owners = new Map(); let page = 1, total = null;
  while (true) {
    const r = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'h', method: 'getTokenAccounts', params: { mint: MINT, page, limit: 1000, displayOptions: {} } })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'RPC error');
    const ac = j.result?.token_accounts ?? [];
    if (total === null) total = j.result?.total ?? null;
    if (!ac.length) break;
    for (const a of ac) {
      if (!a.owner) continue;
      const am = (Number(a.amount) || 0) / 1e6;
      if (am <= 0) continue;
      owners.set(a.owner, (owners.get(a.owner) || 0) + am);
    }
    setOv(
      total ? Math.min((page * 1000 / total) * 100, 98) : Math.min(page * 5, 96),
      total ? `${Math.min(page * 1000, total).toLocaleString()} / ${total.toLocaleString()}` : `Page ${page}`,
      'Fetching accounts…'
    );
    if (ac.length < 1000) break;
    page++;
    await new Promise(r => setTimeout(r, 50));
  }
  return [...owners.entries()].map(([o, a]) => ({ owner: o, amount: a })).sort((a, b) => b.amount - a.amount);
}

/* ═══ LAYOUT ═══ */
function buildSQ() {
  const lim = parseInt(document.getElementById('ctrlLimit').value) || 0;
  let h = ALL.filter(h => !muted.has(tier(h.amount).id));
  if (lim > 0) h = h.slice(0, lim);
  if (!h.length) { SQ = []; return; }
  const mx = h[0].amount || 1, minS = 8, maxS = 180;
  const items = h.map((hh, i) => {
    const t = tier(hh.amount);
    const sz = Math.round(minS + (maxS - minS) * Math.sqrt(hh.amount / mx));
    return { owner: hh.owner, amount: hh.amount, tier: t, size: sz, known: getKnown(hh.owner, hh.amount, i), x: 0, y: 0, vx: 0, vy: 0 };
  });
  const placed = [], GAP = 6;
  for (const it of items) {
    const s = it.size; let angle = 0, radius = 0; const step = Math.max(s * .35, 10); let ok = false;
    for (let att = 0; att < 1200; att++) {
      const cx = Math.cos(angle) * radius, cy = Math.sin(angle) * radius;
      const x = Math.round(cx - s / 2), y = Math.round(cy - s / 2);
      let hit = false;
      for (const p of placed) {
        if (x < p.x + p.size + GAP && x + s + GAP > p.x && y < p.y + p.size + GAP && y + s + GAP > p.y) { hit = true; break; }
      }
      if (!hit) { it.x = x; it.y = y; ok = true; break; }
      angle += .30; radius += step * .055;
    }
    if (!ok) { it.x = Math.round(Math.cos(angle) * radius); it.y = Math.round(Math.sin(angle) * radius); }
    placed.push(it);
  }
  SQ = items;
  initParticles();
}

/* ═══ PIXEL BG ═══ */
function mkPat(ctx) {
  const c = document.createElement('canvas'); c.width = 80; c.height = 80;
  const p = c.getContext('2d');
  p.fillStyle = '#030a03'; p.fillRect(0, 0, 80, 80);
  const ps = 4;
  for (let y = 0; y < 80; y += ps) for (let x = 0; x < 80; x += ps) {
    const r = Math.random();
    if (r < .04) { p.fillStyle = `rgba(120,177,90,${.02 + Math.random() * .045})`; p.fillRect(x, y, ps, ps); }
    else if (r < .07) { p.fillStyle = 'rgba(120,177,90,0.010)'; p.fillRect(x, y, ps, ps); }
  }
  p.strokeStyle = 'rgba(120,177,90,0.012)'; p.lineWidth = 1;
  for (let x = 0; x < 80; x += ps) { p.beginPath(); p.moveTo(x, 0); p.lineTo(x, 80); p.stroke(); }
  for (let y = 0; y < 80; y += ps) { p.beginPath(); p.moveTo(0, y); p.lineTo(80, y); p.stroke(); }
  pixPat = ctx.createPattern(c, 'repeat');
}

/* ═══ ROUND RECT ═══ */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ═══ RENDER ═══ */
function render() {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const lbl = document.getElementById('ctrlLabel').value;
  const t = performance.now();
  const pulsePhase = Math.sin((t - t0) / 800) * .5 + .5;

  ctx.clearRect(0, 0, W, H);

  if (!pixPat) mkPat(ctx);
  ctx.save(); ctx.translate(tx * .25, ty * .25); ctx.scale(sc * .4 + .6, sc * .4 + .6);
  ctx.fillStyle = pixPat; ctx.fillRect(-W * 3, -H * 3, W * 8, H * 8); ctx.restore();

  ctx.save(); ctx.strokeStyle = 'rgba(120,177,90,0.022)'; ctx.lineWidth = 1;
  const gs = 48, gx0 = ((tx % gs) + gs) % gs, gy0 = ((ty % gs) + gs) % gs;
  for (let x = gx0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = gy0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc);

  /* Proximity lines */
  if (sc > 0.4 && SQ.length < 600) {
    ctx.globalAlpha = 0.06 * cl(sc, 0, 2); ctx.strokeStyle = 'rgba(120,177,90,1)'; ctx.lineWidth = 1 / sc; ctx.setLineDash([4 / sc, 6 / sc]);
    for (let i = 0; i < SQ.length; i++) {
      const a = SQ[i]; if (muted.has(a.tier.id)) continue;
      for (let j = i + 1; j < Math.min(i + 8, SQ.length); j++) {
        const b = SQ[j]; if (muted.has(b.tier.id)) continue; if (a.tier.id !== b.tier.id) continue;
        const dx = b.x + b.size / 2 - a.x - a.size / 2, dy = b.y + b.size / 2 - a.y - a.size / 2;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < (a.size + b.size) * 2.5) { ctx.beginPath(); ctx.moveTo(a.x + a.size / 2, a.y + a.size / 2); ctx.lineTo(b.x + b.size / 2, b.y + b.size / 2); ctx.stroke(); }
      }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  /* Particles */
  tickParticles();
  ctx.lineWidth = .6 / sc;
  for (let i = 0; i < particles.length; i += 3) {
    const a = particles[i];
    for (let j = i + 3; j < particles.length; j += 3) {
      const b = particles[j]; const dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy; const maxD = 45;
      if (d2 < maxD * maxD) { const d = Math.sqrt(d2); const alpha = Math.min(a.alpha, b.alpha) * (1 - d / maxD) * .5; ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(120,177,90,1)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
  }
  for (const p of particles) { ctx.globalAlpha = p.alpha; ctx.fillStyle = 'rgba(120,177,90,1)'; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
  ctx.globalAlpha = 1;

  /* Squares */
  const top10 = getTop10();
  const rankMap = new Map();
  top10.forEach((s, i) => rankMap.set(s.owner, i + 1));

  for (const s of SQ) {
    if (muted.has(s.tier.id)) continue;
    const isH = hovered === s, isL = locked === s, isSr = searchSet.has(s.owner), isK = !!s.known;
    const isDrag = dragNode === s;
    const br = s.tier.bright;
    const ssz = s.size * sc;
    const rad = cl(s.size * .12, 1, 6);

    if (isK && !isH && !isL && !isDrag) { ctx.shadowColor = `rgba(120,177,90,${.15 + pulsePhase * .25})`; ctx.shadowBlur = (6 + pulsePhase * 10) / sc; }
    else if (isH || isL || isDrag)      { ctx.shadowColor = isDrag ? 'rgba(120,177,90,.7)' : gG(br); ctx.shadowBlur = (isDrag ? 28 : 20) / sc; }
    else if (isSr)                       { ctx.shadowColor = 'rgba(255,220,100,.5)'; ctx.shadowBlur = 14 / sc; }
    else ctx.shadowBlur = 0;

    ctx.globalAlpha = (isH || isL || isDrag) ? 1 : isSr ? .92 : .72;
    ctx.fillStyle = (isH || isL || isDrag) ? gFH(Math.min(br + .15, 1)) : gF(br, .88);
    rr(ctx, s.x, s.y, s.size, s.size, rad); ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = (isH || isL || isDrag) ? .20 : .10;
    const gr = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.size);
    gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(.5, 'rgba(120,177,90,.04)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = gr; rr(ctx, s.x, s.y, s.size, s.size, rad); ctx.fill(); ctx.globalAlpha = 1;

    ctx.strokeStyle = (isH || isL || isDrag) ? 'rgba(200,255,160,.92)' : isSr ? 'rgba(255,220,100,.65)' : isK ? `rgba(120,177,90,${.35 + pulsePhase * .25})` : gB(br);
    ctx.lineWidth = ((isH || isL || isDrag) ? 2.5 : isK ? 1.5 + pulsePhase * .5 : 1) / sc;
    rr(ctx, s.x, s.y, s.size, s.size, rad); ctx.stroke();

    /* Rank badge */
    const rank = rankMap.get(s.owner);
    if (rank && ssz > 16 && lbl !== 'none') {
      const bSz = cl(s.size * .18, 2.5, 16);
      const bx = s.x + s.size / 2 - bSz / 2;
      const by = isK ? s.y + s.size * .12 : s.y + s.size * .15;
      const bAlpha = cl((ssz - 16) / 14, 0, 1);
      ctx.globalAlpha = (.75 + pulsePhase * .15) * bAlpha;
      ctx.fillStyle = rank === 1 ? 'rgba(120,177,90,.85)' : 'rgba(120,177,90,.45)';
      ctx.fillRect(bx, by, bSz, bSz);
      ctx.strokeStyle = rank === 1 ? 'rgba(180,255,140,.55)' : 'rgba(120,177,90,.28)';
      ctx.lineWidth = .8 / sc; ctx.strokeRect(bx, by, bSz, bSz);
      const rf = cl(bSz * .58, 2, 10);
      ctx.font = `700 ${rf}px 'IBM Plex Mono',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rank === 1 ? '#000' : 'rgba(0,0,0,.75)'; ctx.globalAlpha = bAlpha;
      ctx.fillText(String(rank), bx + bSz / 2, by + bSz / 2);
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }

    /* Dynamic labels */
    if (lbl !== 'none' && ssz > 12) {
      const fadeAlpha = cl((ssz - 12) / 16, 0, 1);
      ctx.globalAlpha = ((isH || isL) ? 1 : .85) * fadeAlpha;
      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 3 / sc;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = (isH || isL) ? 'rgba(255,255,255,.98)' : 'rgba(255,255,255,.88)';
      if (isK && ssz > 50) {
        const sf1 = cl(ssz / 8, 8, 18), sf2 = cl(ssz / 11, 6, 13); const wf1 = sf1 / sc, wf2 = sf2 / sc;
        ctx.font = `700 ${wf1}px 'IBM Plex Mono',monospace`;
        let tag = s.known.tag;
        while (ctx.measureText(tag).width > s.size * .88 && tag.length > 4) tag = tag.slice(0, -2) + '…';
        ctx.fillText(tag, s.x + s.size / 2, s.y + s.size / 2 - wf1 * .6);
        ctx.font = `500 ${wf2}px 'IBM Plex Mono',monospace`; ctx.fillStyle = `rgba(255,255,255,${.55 * fadeAlpha})`;
        ctx.fillText(fA(s.amount), s.x + s.size / 2, s.y + s.size / 2 + wf1 * .75);
      } else {
        const sf = cl(ssz / 5.5, 6, 15); const wf = sf / sc;
        ctx.font = `600 ${wf}px 'IBM Plex Mono',monospace`;
        let txt = '';
        if (lbl === 'amt') txt = fA(s.amount);
        else if (lbl === 'addr') txt = sh(s.owner);
        else if (lbl === 'pct') txt = fP(s.amount / SUPPLY);
        while (ctx.measureText(txt).width > s.size * .86 && txt.length > 3) txt = txt.slice(0, -2) + '…';
        if (txt) ctx.fillText(txt, s.x + s.size / 2, s.y + s.size / 2);
      }
      ctx.shadowBlur = 0; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }
  }

  /* Ripples */
  const now2 = performance.now();
  ripples = ripples.filter(r => (now2 - r.t0) < r.dur);
  for (const r of ripples) {
    const prog = (now2 - r.t0) / r.dur; const rad2 = r.maxR * prog; const alpha = (1 - prog) * .35;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad2, 0, Math.PI * 2); ctx.strokeStyle = `rgba(120,177,90,${alpha})`; ctx.lineWidth = 2 / sc; ctx.stroke();
  }

  ctx.restore();
  document.getElementById('fZ').textContent = 'Zoom: ' + Math.round(sc * 100) + '%';
}

/* ═══ ANIMATION LOOP ═══ */
let rafId = null;
function frame() {
  rafId = requestAnimationFrame(frame);
  tickAnim();
  tickPhysics();
  render();
}

function hitTest(wx, wy) {
  for (let i = SQ.length - 1; i >= 0; i--) {
    const s = SQ[i];
    if (muted.has(s.tier.id)) continue;
    if (wx >= s.x && wx <= s.x + s.size && wy >= s.y && wy <= s.y + s.size) return s;
  }
  return null;
}

function showIP(s) {
  const rank = ALL.findIndex(h => h.owner === s.owner) + 1; const t = s.tier;
  const b = document.getElementById('ipBadge');
  b.textContent = t.label; b.style.background = t.color + '22'; b.style.border = '1px solid ' + t.color + '55'; b.style.color = t.color;
  document.getElementById('ipAddr').textContent = s.owner;
  document.getElementById('ipAmt').textContent = fA(s.amount) + ' $BASIS';
  document.getElementById('ipPct').textContent = fP(s.amount / SUPPLY) + ' of supply';
  document.getElementById('ipRank').textContent = 'Rank #' + rank + ' of ' + ALL.length.toLocaleString();
  const sp = document.getElementById('ipSpec');
  if (s.known) { sp.textContent = '⚡ ' + s.known.name; sp.style.display = 'block'; } else sp.style.display = 'none';
  document.getElementById('ipLink').href = 'https://orbmarkets.io/address/' + s.owner;
  document.getElementById('ip').classList.add('show');
}

function hideIP() { document.getElementById('ip').classList.remove('show'); locked = null; }

/* ═══ INTERACTION ═══ */
function setup() {
  const cv = document.getElementById('map');
  let isPan = false, panSt = null, didDrag = false;

  cv.addEventListener('mousedown', e => {
    animating = false;
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const w = toW(sx, sy);
    const hit = hitTest(w.x, w.y);
    didDrag = false;
    if (hit) {
      dragNode = hit; dragOff = { x: w.x - hit.x, y: w.y - hit.y }; cv.style.cursor = 'grabbing';
    } else {
      isPan = true; panSt = { x: e.clientX, y: e.clientY, tx, ty }; cv.classList.add('panning');
    }
  });

  cv.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const w = toW(sx, sy);

    if (dragNode) {
      dragNode.x = w.x - dragOff.x; dragNode.y = w.y - dragOff.y; didDrag = true; dragging = true;
      cv.style.cursor = 'grabbing'; document.getElementById('tip').classList.remove('show'); return;
    }

    if (isPan && panSt) {
      const dx = e.clientX - panSt.x, dy = e.clientY - panSt.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
      tx = panSt.tx + dx; ty = panSt.ty + dy; tTx = tx; tTy = ty; return;
    }

    const hit = hitTest(w.x, w.y), prev = hovered;
    hovered = hit;
    if (hit && hit !== prev) { addRipple(hit.x + hit.size / 2, hit.y + hit.size / 2, hit.size * .8); }

    const tip = document.getElementById('tip');
    if (hit) {
      document.getElementById('hA').textContent = hit.known ? hit.known.name : sh(hit.owner);
      document.getElementById('hV').textContent = fA(hit.amount) + ' $BASIS';
      const ht = document.getElementById('hT'); ht.textContent = hit.tier.label; ht.style.color = hit.tier.color;
      tip.classList.add('show');
      let px = e.clientX + 14, py = e.clientY - 10;
      if (px + 230 > window.innerWidth) px = e.clientX - 230;
      if (py + 80 > window.innerHeight) py = e.clientY - 80;
      tip.style.left = px + 'px'; tip.style.top = py + 'px';
      cv.style.cursor = 'grab';
    } else { tip.classList.remove('show'); cv.style.cursor = 'crosshair'; }
  });

  window.addEventListener('mouseup', () => {
    if (dragNode) { dragNode = null; dragOff = null; dragging = false; }
    isPan = false; panSt = null; cv.classList.remove('panning'); cv.style.cursor = 'crosshair';
  });

  cv.addEventListener('mouseleave', () => { document.getElementById('tip').classList.remove('show'); hovered = null; });

  cv.addEventListener('click', e => {
    if (didDrag) return;
    const r = cv.getBoundingClientRect(), w = toW(e.clientX - r.left, e.clientY - r.top), hit = hitTest(w.x, w.y);
    if (hit) { locked = hit; showIP(hit); } else hideIP();
  });

  document.getElementById('ipX').addEventListener('click', hideIP);

  cv.addEventListener('wheel', e => {
    e.preventDefault(); animating = false;
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const d = e.deltaY > 0 ? .87 : 1.13, ns = cl(sc * d, .03, 80), rt = ns / sc;
    tx = mx - (mx - tx) * rt; ty = my - (my - ty) * rt; sc = ns; tTx = tx; tTy = ty; tSc = sc;
  }, { passive: false });

  document.getElementById('zIn').addEventListener('click',  () => { const cx = cv.width / 2, cy = cv.height / 2, ns = cl(sc * 1.4, .03, 80), r = ns / sc; animateTo(cx - (cx - tx) * r, cy - (cy - ty) * r, ns); });
  document.getElementById('zOut').addEventListener('click', () => { const cx = cv.width / 2, cy = cv.height / 2, ns = cl(sc * .7,  .03, 80), r = ns / sc; animateTo(cx - (cx - tx) * r, cy - (cy - ty) * r, ns); });
  document.getElementById('zFit').addEventListener('click', () => smoothZoomFit());

  /* Touch */
  let ts = null, pd = null, td = false, touchDrag = null, touchDragOff = null;
  cv.addEventListener('touchstart', e => {
    animating = false;
    if (e.touches.length === 1) {
      const t = e.touches[0], r = cv.getBoundingClientRect(), sx = t.clientX - r.left, sy = t.clientY - r.top;
      const w = toW(sx, sy), hit = hitTest(w.x, w.y); td = false;
      if (hit) { touchDrag = hit; dragNode = hit; touchDragOff = { x: w.x - hit.x, y: w.y - hit.y }; dragOff = touchDragOff; }
      else     { ts = { x: t.clientX, y: t.clientY, tx, ty }; }
    } else if (e.touches.length === 2) {
      touchDrag = null; dragNode = null; touchDragOff = null; dragOff = null;
      pd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    if (touchDrag && e.touches.length === 1) {
      const t = e.touches[0], r = cv.getBoundingClientRect(), sx = t.clientX - r.left, sy = t.clientY - r.top;
      const w = toW(sx, sy); touchDrag.x = w.x - touchDragOff.x; touchDrag.y = w.y - touchDragOff.y; td = true; dragging = true;
    } else if (ts && e.touches.length === 1) {
      const t = e.touches[0], dx = t.clientX - ts.x, dy = t.clientY - ts.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) td = true; tx = ts.tx + dx; ty = ts.ty + dy; tTx = tx; tTy = ty;
    } else if (e.touches.length === 2 && pd) {
      const nd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const r = nd / pd; const cx2 = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy2 = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = cv.getBoundingClientRect(), mx = cx2 - rect.left, my = cy2 - rect.top;
      const ns = cl(sc * r, .03, 80), sr = ns / sc; tx = mx - (mx - tx) * sr; ty = my - (my - ty) * sr; sc = ns; tTx = tx; tTy = ty; tSc = sc; pd = nd;
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchend', e => {
    if (!td && !touchDrag && ts && e.changedTouches.length) {
      const t2 = e.changedTouches[0], r = cv.getBoundingClientRect(), w = toW(t2.clientX - r.left, t2.clientY - r.top), hit = hitTest(w.x, w.y);
      if (hit) { locked = hit; showIP(hit); } else hideIP();
    }
    ts = null; pd = null; touchDrag = null; touchDragOff = null; dragNode = null; dragOff = null; dragging = false;
  });

  /* Search */
  document.getElementById('search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); searchSet.clear();
    if (q.length >= 3) {
      for (const s of SQ) { if (s.owner.toLowerCase().includes(q) || (s.known && s.known.name.toLowerCase().includes(q))) searchSet.add(s.owner); }
      if (searchSet.size) {
        const f = SQ.find(s => searchSet.has(s.owner));
        if (f) { const ns = cl(sc, 1.5, 4); const cx = cv.width / 2, cy = cv.height / 2; animateTo(cx - (f.x + f.size / 2) * ns, cy - (f.y + f.size / 2) * ns, ns); }
        toast(`${searchSet.size} match${searchSet.size > 1 ? 'es' : ''}`, 'ok', 2000);
      }
    }
  });

  ['ctrlLimit', 'ctrlLabel'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => { if (!ALL.length) return; buildSQ(); smoothZoomFit(); updateStats(); });
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const a = document.createElement('a'); a.download = 'basis-holder-map-' + Date.now() + '.png'; a.href = cv.toDataURL('image/png'); a.click();
    toast('✓ Exported as PNG', 'ok', 2000);
  });
}

/* ═══ ZOOM HELPERS ═══ */
function calcFit(subset) {
  const c = document.getElementById('map');
  let a = Infinity, b = Infinity, d = -Infinity, e = -Infinity;
  const list = subset || SQ;
  for (const s of list) {
    if (muted.has(s.tier.id)) continue;
    a = Math.min(a, s.x); b = Math.min(b, s.y); d = Math.max(d, s.x + s.size); e = Math.max(e, s.y + s.size);
  }
  if (!isFinite(a)) return null;
  const p = 50, bw = d - a + p * 2, bh = e - b + p * 2;
  const nsc = Math.min(c.width / bw, c.height / bh, 2.5);
  const ntx = c.width / 2 - ((a + d) / 2) * nsc; const nty = c.height / 2 - ((b + e) / 2) * nsc;
  return { tx: ntx, ty: nty, sc: nsc };
}
function zoomFit()             { const f = calcFit(); if (f) { tx = f.tx; ty = f.ty; sc = f.sc; tTx = tx; tTy = ty; tSc = sc; } }
function smoothZoomFit(subset) { const f = calcFit(subset); if (f) animateTo(f.tx, f.ty, f.sc); }

/* ═══ LEGEND ═══ */
function buildLegend() {
  const bar = document.getElementById('legendBar'); bar.innerHTML = '';
  const counts = {}; TIERS.forEach(t => counts[t.id] = 0);
  for (const h of SQ) counts[h.tier.id]++;
  TIERS.forEach(t => {
    const el = document.createElement('div');
    el.className = 'leg-item' + (muted.has(t.id) ? ' muted' : '');
    el.innerHTML = `<div class="leg-dot" style="background:${t.color};border-color:${t.color}55"></div><span style="color:${t.color}">${t.label}</span><span class="leg-count">(${counts[t.id]})</span>`;
    el.addEventListener('click', e => {
      if (e.detail === 2) return;
      if (muted.has(t.id)) muted.delete(t.id); else muted.add(t.id);
      el.classList.toggle('muted'); buildSQ(); updateStats();
      document.getElementById('fH').textContent = 'Holders: ' + SQ.length.toLocaleString();
    });
    el.addEventListener('dblclick', () => {
      if (muted.has(t.id)) return;
      const tierNodes = SQ.filter(s => s.tier.id === t.id);
      if (tierNodes.length) smoothZoomFit(tierNodes);
      toast(`Zooming to ${t.label}s (${tierNodes.length})`, 'ok', 1800);
    });
    bar.appendChild(el);
  });
}

/* ═══ STATS ═══ */
function updateStats() {
  if (!SQ.length) return;
  const amounts = SQ.map(s => s.amount);
  const totalHeld = amounts.reduce((a, b) => a + b, 0); const avg = totalHeld / amounts.length;
  const sorted = [...amounts].sort((a, b) => a - b);
  const med = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  document.getElementById('fH').textContent      = 'Holders: ' + SQ.length.toLocaleString();
  document.getElementById('fSupply').textContent  = 'Held: ' + fA(totalHeld);
  document.getElementById('fAvg').textContent     = 'Avg: ' + fA(avg);
  document.getElementById('fMed').textContent     = 'Med: ' + fA(med);
}

/* ═══ RESIZE ═══ */
function resize() {
  const c = document.getElementById('map'), wrap = document.getElementById('mapArea');
  const panel = document.querySelector('.panel'), footer = document.querySelector('.footer-row');
  const panelRect = panel.getBoundingClientRect(); const mapW = Math.round(panelRect.width);
  const mapTop = wrap.getBoundingClientRect().top; const footerH = footer ? footer.offsetHeight + 12 : 0;
  const bodyPadB = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
  const panelBorderB = parseFloat(getComputedStyle(panel).borderBottomWidth) || 0;
  const mapH = Math.round(window.innerHeight - mapTop - footerH - bodyPadB - panelBorderB - 2);
  const fw = Math.max(mapW, 100), fh = Math.max(mapH, 150);
  wrap.style.height = fh + 'px'; c.width = fw; c.height = fh; pixPat = null; return true;
}

/* ═══ LOAD ═══ */
async function load() {
  const sts = document.getElementById('sts');
  document.getElementById('refreshBtn').disabled = true; document.getElementById('exportBtn').disabled = true;
  sts.textContent = 'FETCHING'; sts.classList.remove('live');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise(r => setTimeout(r, 50)); resize();
  try {
    ALL = await fetchAll();
    setOv(100, 'Done — ' + ALL.length.toLocaleString() + ' holders');
    await new Promise(r => setTimeout(r, 200));
    resize(); buildSQ(); buildLegend(); zoomFit(); updateStats();
    hideOv();
    sts.textContent = 'LIVE'; sts.classList.add('live');
    document.getElementById('exportBtn').disabled = false; document.getElementById('refreshBtn').disabled = false;
    document.getElementById('fT').textContent = 'Last updated: ' + now();
    loaded = true;
    toast(`✓ ${ALL.length.toLocaleString()} holders mapped`, 'ok', 3500);
  } catch (err) {
    hideOv(); sts.textContent = 'ERROR'; sts.classList.remove('live');
    toast('Error: ' + err.message, 'err', 5000); console.error(err);
    document.getElementById('refreshBtn').disabled = false;
  }
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('hide');
  setOv(0, 'Starting…', ''); document.getElementById('ovTitle').textContent = 'Refreshing…';
  locked = null; hideIP(); load();
});

/* ═══ INIT ═══ */
setup(); buildLegend(); frame();
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (loaded) { buildSQ(); zoomFit(); } }, 200); });
load();
