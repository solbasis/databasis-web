# BASIS — Roadmap

> **Last updated:** 2026-04-27
> Living document. Material changes versioned; cosmetic changes silent.
> Distinction: ✅ shipped · 🟡 in flight · 🔵 planned · ⚪ exploration

This roadmap distinguishes what is **already live** (and therefore not a
promise) from what is **next** (specific commitments) from what is
**vision** (directional intent, subject to DAO governance and resource
availability). We treat the line between "shipped" and "soon" as
load-bearing — every shipped item has a public URL you can verify
right now.

---

## Phase 0 · Foundation _(complete · live as of 2026-04)_

The base ecosystem is live, audited where applicable, and battle-tested
on Solana mainnet.

| | App | URL | Notes |
|---|---|---|---|
| ✅ | BASIS Terminal | [databasis.info](https://databasis.info) | Real-time analytics, ecosystem hub |
| ✅ | BASIS Burn | [burn.databasis.info](https://burn.databasis.info) | Audit-passed twice (2026-04-26) |
| ✅ | BASIS DAO | [dao.databasis.info](https://dao.databasis.info) | SPL Governance v3 |
| ✅ | BASIS Chat | [chat.databasis.info](https://chat.databasis.info) | App Check enforced |
| ✅ | DeFi Tower Defense | [game.databasis.info](https://game.databasis.info) | 7 stages × 105 waves |
| ✅ | BASIS Art | [art.databasis.info](https://art.databasis.info) | CRT shader, animation timeline |
| ✅ | NFT Deployer | [deployer.databasis.info](https://deployer.databasis.info) | Metaplex Core + Candy Machine |
| ✅ | BASIS Bot | Telegram | AI-augmented buy alerts |
| ✅ | BASIS Backend | (server) | Cloud Functions for sanitisation |
| ✅ | Genesis NFT collection | Magic Eden / Tensor | 50 supply, secondary live |
| ✅ | $BASIS token | Pump.fun graduated | 100% liquidity burnt |

**What this gives the project** — a complete, internally-consistent
software suite that doesn't require any single user to "trust the
roadmap." Every feature can be verified by clicking through.

---

## Phase 1 · Polish + utility _(0–3 months · Q2–Q3 2026)_

The work that matters most after Phase 0: turn each shipped app from
"feature-complete" into "polished and recommended." No new apps.
Improvements to what exists.

### 1.1 Burn — round-3 polish 🟡

- **🟡 Whale-glow row highlight** when an empty token account holds rent > 1% of total wallet balance — visual signal of high-value items
- **🟡 BUYS / SELLS / TRANSFERS filter dropdown** on the activity feed
- **🟡 First-time-buyer NEW pill** on Telegram-bot integrated activity views
- **🔵 Social share card** generator post-burn (composable image with recovered SOL + tx link, branded)

### 1.2 Terminal — depth analytics 🟡

- **🟡 Live holder distribution chart** (top 10, top 100, total) — currently a static card
- **🟡 PnL Monitor full implementation** — currently linked but stubbed
- **🟡 Holder Map redesign** — heat-map view of geographic / wallet-cluster distribution
- **🔵 Trader-of-the-week leaderboard** based on parsed tx history

### 1.3 DAO — UX hardening 🔵

- **🔵 Proposal templates** — pre-filled scaffolds for common proposal types (treasury allocation, parameter change, partnership)
- **🔵 Vote-receipt downloadable PDF** for tax / record-keeping
- **🔵 NFT boost on-chain enforcement** — currently 1.5× is advisory in the UI; move it on-chain via a custom client-side weight calculation that mirrors what the realm sees
- **🔵 Mobile-first proposal browser**

### 1.4 Chat — community features 🔵

- **🔵 Wallet-verified badges** — link a Solana wallet signature to a chat profile, show verified holder badge in messages
- **🔵 Slash commands** — `/price`, `/recovered`, `/proposals` (data pulls from terminal + burn + DAO)
- **🔵 Markdown threading** — replies to specific messages, not just chronological flow
- **🔵 Mention-driven Telegram cross-post** — `@basis_bot` mention pushes a message to Telegram

### 1.5 Game — replayability ⚪

- **⚪ Online leaderboard** (Firestore-backed) — top scores per stage
- **⚪ Daily challenge mode** — fixed seed, 24h window, leaderboard reset
- **⚪ NFT-bound starting bonuses** — Genesis holders get small in-game advantages

### 1.6 Cross-cutting infrastructure 🟡

- **🟡 Migrate from `@solana/web3.js` v1 → `@solana/kit`** in burn, gov, deployer. Removes the buffer/crypto/stream polyfill complexity entirely.
- **🟡 Bump GitHub Actions Node 20 → 24** (Node 20 deprecated September 2026; tracked in CI annotations)
- **🔵 Add SRI hashes** to bundled JS for tamper detection
- **🔵 Public status page** showing Helius / Firebase / RPC health for ecosystem apps

---

## Phase 2 · Treasury + earned utility _(3–6 months · Q3–Q4 2026)_

Once the existing apps are polished, the question becomes: how does the
ecosystem earn its way into sustainability without breaking the
"public-utility tools are free" principle?

### 2.1 DAO treasury bootstrap 🔵

- **🔵 Treasury creation** — multisig (3-of-5 from public DAO membership) holds initial reserve in $BASIS + SOL
- **🔵 Treasury reporting** — monthly on-chain summary published to chat + dashboard
- **🔵 First treasury proposals** — fund specific roadmap line items via DAO vote

### 2.2 Optional revenue surfaces 🔵

These are **opt-in only** for users who want to support the project. None
of them gate existing public utility.

- **🔵 Burn — optional 1% tip** — checkbox on the burn confirm modal: "donate 1% of recovered SOL to the BASIS DAO treasury." Default off.
- **🔵 Deployer — premium template marketplace** — paid premium NFT mint-page templates (one-off SOL purchase). Free templates remain free.
- **🔵 Chat — premium identity** — paid one-time animated profile frames or status flairs
- **⚪ Bot — Telegram Pro for project teams** — basis-bot fork available as managed service for *other* tokens (white-labeled buy alerts). Project pays the team a flat monthly SOL fee.

### 2.3 Genesis NFT utility ratification 🔵

The DAO will choose Genesis utility from a slate of options put up for
on-chain vote in Phase 2. Candidate options (not commitments):

- **🔵 Voting weight multiplier** — already 1.5× advisory; vote to make it on-chain enforced
- **🔵 Discord/Telegram exclusive role**
- **🔵 First access to roadmap features**
- **🔵 Treasury revenue share** (proportional)

The slate, the vote, and the result are all public.

### 2.4 New ecosystem app — first DAO-funded build ⚪

Whatever the DAO votes to fund first is the first new app in BASIS
history that wasn't built by the original team. The roadmap deliberately
does not pre-commit to what this is.

---

## Phase 3 · Scaling + integrations _(6–12 months · 2027)_

This phase assumes Phases 1 & 2 land successfully. Treats the BASIS
ecosystem as a platform, not a product.

### 3.1 Burn-as-a-service ⚪

- **⚪ White-label Burn** — other Solana projects embed a branded burn panel on their own sites. BASIS provides the SDK + UI; they keep their users on their own domain. Optional tip routes to BASIS treasury.
- **⚪ Token-burn dashboard** for any SPL mint — analytics on cumulative supply burned by holders, over time

### 3.2 Bot-as-a-service ⚪

- **⚪ Multi-token basis-bot** — one bot instance can monitor an arbitrary token list. Project teams can self-onboard via a paid tier (see Phase 2.2).

### 3.3 Cross-protocol integrations ⚪

- **⚪ Jupiter integration in Terminal** — instant swap from $BASIS without leaving databasis.info
- **⚪ Drift / Mango integration** — token-collateralised borrowing for Genesis holders
- **⚪ Magic Eden / Tensor deeper integration** in Genesis utility flows

### 3.4 Mobile ⚪

- **⚪ Native mobile app** — React Native or Flutter wrapper around the existing web apps, with mobile-first wallet adapters
- **⚪ Offline-first burn scanning** — scan locally, defer signing until reconnected

### 3.5 Possibly: a custom on-chain program ⚪

The "no custom contracts" principle is held loosely, not religiously. If
governance identifies a specific user need that genuinely cannot be
served by existing Solana primitives, the DAO can vote to fund a
custom Anchor program. Hypothetical examples:

- A burn-distribution program that splits recovered SOL between user / treasury / referrer atomically
- A reputation/badge program tying off-chain achievements to on-chain attestations

If we ever ship one, it will be:
- Audited by an external firm (Halborn / OtterSec / Trail of Bits)
- Open-source from day one
- Deployed under a multisig upgrade authority
- Eventually frozen (mutability removed) once stable

---

## Phase 4 · Vision _(12+ months · 2027 and beyond)_

Directional intent, not commitments. These are the questions BASIS will
ask of itself, not promises to deliver answers.

- Can the ecosystem support a small full-time team without breaking the no-fees principle?
- What does "BASIS Foundation" look like as a non-profit shell for the open-source work?
- Can the chatroom evolve into a federated, decentralized identity layer for Solana communities?
- Could the analytics terminal serve as a public good — used by other projects, funded by them via DAO grants — rather than a single-token tool?
- Is there a place for a BASIS token-curated registry of safe / verified Solana projects, where token-weighted votes attest to legitimacy?

---

## How priority is decided

The original team triages Phase 1 and the operational tail of Phase 2
because those items are mostly maintenance + polish on what exists. From
Phase 2 onward, prioritisation is increasingly DAO-driven:

| Phase | Decision body |
|---|---|
| 1 (polish) | Maintainers, with public issue tracker |
| 2 (treasury / revenue) | DAO vote on each line item |
| 3 (scaling) | DAO vote, funded by treasury |
| 4 (vision) | DAO + community direction-setting |

A line item moves from ⚪ (exploration) → 🔵 (planned) when a public
proposal is drafted with scope + cost. From 🔵 → 🟡 when a maintainer
or contributor is actively working on it. From 🟡 → ✅ when the
implementation is live in production with the URL listed publicly.

---

## What we promise

- **We will keep this document honest.** If something slips a phase,
  it gets bumped publicly, not quietly deleted.
- **We will not pre-announce** features that don't have a maintainer
  ready to start. Vapor-shipping a roadmap is the easiest way to lose
  the community's trust.
- **We will be transparent about constraints.** If the team's bandwidth
  is the bottleneck, we'll say so. If treasury runway is the
  bottleneck, we'll say that.

## What we don't promise

- **Specific dates.** Phase boundaries are quarterly ranges, not fixed
  timestamps. Crypto roadmaps with hard deadlines are usually lying.
- **Token price action.** Nothing in this document is a price prediction
  or financial advice.
- **That every line item ships.** Some will be obsoleted by changing
  conditions; some will be superseded by better ideas the DAO
  surfaces. Adaptability over commitment.

---

**Status as of publish:** Phase 0 complete · Phase 1 in flight · Phases 2–4 planned/exploration
**Next public update:** when the first Phase 2 DAO proposal goes live, we'll re-version this document.
