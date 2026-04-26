# BASIS — Whitepaper

> **Version 1.0 · 2026-04-27**
> A self-funded, open-source ecosystem on Solana mainnet.
> Token: `A5BJBQUTR5sTzkM89hRDuApWyvgjdXpR7B7rW1r9pump`

---

## Abstract

BASIS is an ecosystem of nine production-grade applications built around
a fair-launched Solana token. The thesis is simple: a token without
software has nothing to coordinate around, and software without a token
has no native economy. BASIS pairs a transparent Pump.fun launch
(100% liquidity burnt, zero team allocation) with a coherent suite of
tools — analytics, governance, dust-recovery, NFT tooling, a chatroom,
a game, an art studio, a buy-alert bot, and a server-side moderation
layer — each shipped, audited where applicable, and open source.

This document describes the system as it exists today (not as a roadmap
promise), the technical decisions behind it, the economic model, and the
risk profile a careful reader should understand before participating.

---

## Table of contents

1. [Vision and thesis](#1-vision-and-thesis)
2. [Token](#2-token)
3. [Ecosystem applications](#3-ecosystem-applications)
4. [Architecture](#4-architecture)
5. [Governance](#5-governance)
6. [Burn economics](#6-burn-economics)
7. [Genesis NFT collection](#7-genesis-nft-collection)
8. [Security model](#8-security-model)
9. [Risk disclosures](#9-risk-disclosures)
10. [Open source and contribution](#10-open-source-and-contribution)

---

## 1. Vision and thesis

### 1.1 Why BASIS exists

Most fair-launched Solana tokens follow the same arc: a Pump.fun launch,
a brief window of attention, a Telegram channel that goes quiet, and an
abandoned chart. The token is treated as the entire product. Holders are
left with nothing but a chart to refresh.

BASIS treats the token as the *foundation*, not the product. The product
is what you can do once you hold it, build with it, or stand near its
community: real software, useful enough to attract people who don't yet
hold the token, and aligned enough that those who do hold it have
mechanisms to coordinate, govern, and benefit from the network.

### 1.2 Design principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **Software first, token second** | Every app must justify itself on utility before any token gating |
| 2 | **No custom contracts** | All on-chain operations route through audited Solana primitives (SPL Governance, Metaplex, SPL Token). Zero "we wrote our own program" risk. |
| 3 | **Open source** | All nine apps are public on GitHub. Reviewable, forkable, criticisable. |
| 4 | **One coherent identity** | Terminal/CRT aesthetic across every surface. The brand is a recognizable artefact, not a logo bolted onto a wallet adapter. |
| 5 | **Transparent infra** | Single Firebase project (`basis-acfec`), one set of Firestore rules, deployment pipelines public. |
| 6 | **No extractive defaults** | Public-utility tools (Burn, Art, Deployer, Terminal, Chat) charge zero fees regardless of whether you hold $BASIS. |
| 7 | **Community-defined direction** | DAO governance is the canonical mechanism for shaping the project's future. |

### 1.3 What BASIS is not

- Not a high-frequency-trading desk in costume
- Not a launchpad pretending to be a community
- Not a gated platform with a "premium tier" behind the token
- Not a custodial product — every interaction routes through user wallets
- Not anonymous — open source, on-chain everything, public deployments

---

## 2. Token

### 2.1 Core facts

| Attribute | Value |
|---|---|
| **Mint address** | `A5BJBQUTR5sTzkM89hRDuApWyvgjdXpR7B7rW1r9pump` |
| **Network** | Solana mainnet |
| **Standard** | SPL Token (Token-2022 compatible scanners) |
| **Decimals** | 6 |
| **Total supply** | 1,000,000,000 BASIS (one billion, hard-capped) |
| **Liquidity** | 100% burnt at launch (Pump.fun graduation pool) |
| **Mint authority** | Revoked |
| **Freeze authority** | Revoked |
| **Team allocation** | None |
| **Pre-sale** | None |
| **Vesting / cliffs** | None |

### 2.2 Distribution

The token launched on Pump.fun under standard fair-launch mechanics:
anyone could buy at curve price, no allocation set aside for insiders,
no early team buys disclosed or undisclosed. Once the bonding curve
graduated, liquidity was deposited and burnt. From that moment forward
$BASIS is held entirely by the public.

### 2.3 Supply mechanics

- **Inflation:** none. The mint authority is revoked; no new tokens can ever be created.
- **Deflation:** market-driven only. Holders can voluntarily burn tokens; nothing in the protocol auto-burns.
- **Locked supply:** 100% of liquidity is permanently burnt. No team-locked allocations exist that could unlock later.

### 2.4 Roles in the ecosystem

| Use case | Mechanism | App |
|---|---|---|
| Governance voting weight | Token deposit → SPL Governance | DAO |
| Proposal creation gate | ≥ 10,000,000 BASIS deposited | DAO |
| In-game currency | Earned + spent inside the game economy | Tower Defense |
| Public buy signal | Watched by basis-bot for Telegram alerts | Bot |
| Holder coordination | Implicit — wallet ↔ identity in chat (optional) | Chat |

Critically, **none** of: Terminal analytics, Burn, Art, NFT Deployer,
or basic chatroom usage requires holding $BASIS. The token gates only
governance influence and game economy participation. The rest of the
ecosystem is public infrastructure.

---

## 3. Ecosystem applications

Nine apps, all live, all production. Each has its own GitHub repo, its
own deployment pipeline, and its own subdomain.

### 3.1 BASIS Terminal · `databasis.info`

The hub. Real-time price (DexScreener + Helius + Jupiter triangulation),
market cap, 24h volume, liquidity, holder distribution, recent on-chain
activity table (parsed via Helius enhanced-tx API into BUY/SELL/TRANSFER
classifications), and links to every other ecosystem surface. Read-only;
no wallet connection required.

**Stack:** Vanilla JS · Vite · DexScreener API · Helius RPC + DAS + Enhanced API · Canvas (no chart library)

### 3.2 BASIS Burn · `burn.databasis.info`

A "wallet-cleaner" tool. Solana wallets accumulate rent locked inside
empty token accounts (~0.002 SOL each), forgotten dust positions, and
spam NFTs. Multiplied across years of activity, this is typically
0.05–0.5 SOL of recoverable balance per wallet. Burn finds it and gives
it back in a single signed transaction.

**Features:** wallet scan (empty accounts, dust tokens, NFTs, cNFTs) · multi-select with category counts · pre-burn review modal · per-row "burn just this one" · dust-bulk-select (< $0.01) · search + sort · live progress modal · personal recovery sparkline + tier achievements · public all-time recovered counter (Firestore) · audit-passed twice (zero critical/high findings).

**Stack:** React 18 · Vite · `@metaplex-foundation/mpl-bubblegum` 5 · `@metaplex-foundation/mpl-core` 1.10 · `@metaplex-foundation/mpl-token-metadata` 3.4 · `@solana/spl-token` 0.4.14 · Wallet Adapter · Helius · Firebase (counter + App Check)

### 3.3 BASIS DAO · `dao.databasis.info`

On-chain governance via SPL Governance v3 (program ID
`GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw`). Token holders deposit
$BASIS into the realm to gain voting power, create proposals, and vote
yes/no/abstain. NFT boost UI surfaces a 1.5× multiplier display
(non-binding, advisory only). Off-chain proposal metadata (rich
descriptions, attachments) lives in Firestore; the canonical vote
record is on-chain.

**Stack:** Vanilla JS · `@solana/spl-governance` 0.3.28 · Wallet Adapter · Firebase (proposal metadata only)

### 3.4 BASIS Chat · `chat.databasis.info`

Real-time moderated terminal chatroom. Firebase Auth (email-style)
backs identity; Firestore real-time listeners deliver messages.
Role-based moderation (user → mod → admin → dev) enforced by
Firestore rules + Cloud Functions. Direct messages, presence, typing
indicators, message reactions, soft-delete (admin), hard-ban
(dev). Every message is sanitised server-side to prevent name/role
spoofing.

**Stack:** Vanilla JS · Firebase Auth · Firestore · Firebase App Check (reCAPTCHA v3) · Cloud Functions

### 3.5 DeFi Tower Defense · `game.databasis.info`

A 7-stage, 105-wave canvas tower-defense game. Stages introduce
escalating threats — Script Kiddies, Rug Pullers, MEV Bots, Flash Loans,
Whales, 51% Attackers — that follow waypoint paths toward the protocol
core. Six tower types (Auditor, Firewall, Multisig, Validator, LP Pool,
Insurance) each with two upgrade tiers and tactical roles
(damage / slow / AoE / income / heal / range). Economy: $BASIS earned
from defeated enemies, spent on towers. Pure client-side, no backend,
no transactions.

**Stack:** Canvas 2D · Vanilla JS · Self-contained (no external runtime dependencies)

### 3.6 BASIS Art · `art.databasis.info`

Browser-based pixel/ASCII art studio. Drawing tools, animation
timeline, symmetry modes, grid overlay, layer management, export to
PNG (1× → 8×) or animated GIF. CRT shader overlay for that
terminal-glow finish. Command palette (Ctrl+K) and keyboard
shortcuts throughout. No account required, no upload, fully local.

**Stack:** Canvas 2D · WebGL (CRT shader) · Vanilla JS

### 3.7 NFT Deployer · `deployer.databasis.info`

Six-step wizard for shipping a Solana NFT collection end-to-end:
wallet connect → metadata form → asset upload via Irys (Arweave) →
Metaplex Core collection creation → Candy Machine setup with
configurable guards (SOL price, whitelist, mint limits, start date) →
self-contained downloadable mint page (HTML, no backend). Built for
creators who want to ship without writing Solana code.

**Stack:** Vite · Metaplex Umi 1.5 · `@metaplex-foundation/mpl-core` 1.9 · `@metaplex-foundation/mpl-core-candy-machine` 0.3 · Irys uploader

### 3.8 BASIS Bot · Telegram

Always-on Solana mainnet listener for $BASIS purchases via Helius
WebSocket (`accountSubscribe`). Posts buy alerts to Telegram with
SOL spent, tokens received, USD value, and AI commentary (Groq
LLM). Tracks top buyers, detects raids (5+ buys in 10 seconds from
distinct wallets), enforces rate limits and keyword moderation.

**Stack:** Python 3.10+ · asyncio · python-telegram-bot · Helius WebSocket + Enhanced API · Groq API · DexScreener · JSON file persistence

### 3.9 BASIS Backend · server-side

Firebase Cloud Functions that enforce what Firestore rules can't:
message sanitisation (corrects spoofed name/role/color/avatar against
the user's actual profile doc), DM message sanitisation, role-rank
enforcement on user profile updates, and a callable `sendMessage`
endpoint that validates muted/banned/kicked status before insertion.

**Stack:** Node 24 · Firebase Functions v2 · firebase-admin

---

## 4. Architecture

### 4.1 The deliberate "no custom contracts" stance

BASIS does not deploy any custom Solana programs. Every on-chain
operation is performed through one of:

| Program | Purpose | Used by |
|---|---|---|
| SPL Governance v3 | DAO realm, proposals, votes | DAO |
| Metaplex Core (mpl-core) | NFT standard | Burn, Deployer |
| Metaplex Candy Machine | Mint mechanics | Deployer |
| Metaplex Token Metadata | Legacy NFT metadata | Burn, Deployer |
| Metaplex Bubblegum | Compressed NFT operations | Burn |
| SPL Account Compression | Merkle tree management | Burn (transitively) |
| SPL Token / Token-2022 | Token transfers, burn, account close | All |

This is a security choice. Custom programs are the most common attack
surface in the Solana ecosystem; refusing to write any until they are
strictly necessary eliminates the risk entirely.

### 4.2 Off-chain stack

A single Firebase project (`basis-acfec`) hosts:

- **Firestore** — chat messages, user profiles, DM channels, governance proposal metadata, public burn counter
- **Firebase Auth** — chatroom identity (email/anon)
- **Cloud Functions** — server-side validation, message sanitisation, role enforcement
- **App Check** — reCAPTCHA v3 enforcement on Firestore (prevents token replay; required for all reads/writes)
- **Hosting** — secondary deployment surface for `basis-gov` (primary uses GitHub Pages)

**Single source of truth**: Firestore rules are deployed exclusively from `basis-backend`. No other repo's `firebase.json` includes a `firestore` section, so no app can clobber another's rules.

### 4.3 RPC and indexing

[Helius](https://helius.dev) is the sole Solana RPC + DAS + enhanced-API
provider used in production. Each app's API key is domain-restricted to
its specific subdomain in the Helius dashboard. The free tier suffices
for current load.

Each subdomain has its own reCAPTCHA v3 site key registered in Firebase
App Check, isolating apps from one another's failures.

### 4.4 Wallet integration

All on-chain-touching apps use the [Solana Wallet Standard](https://github.com/solana-mobile/wallet-standard) via the
Anza/Solana wallet adapters. Supported wallets:

- Phantom · Solflare · Backpack · Trust · Glow · ledger devices · others (auto-discovered)

Signing always happens in the wallet provider's secure context.
**Private keys never enter any BASIS application.**

### 4.5 Polyfills

Web3.js v1 (used by burn, gov, deployer) requires `buffer`, `crypto`,
and `stream` polyfills in the browser. All Vite-based apps use
[`vite-plugin-node-polyfills`](https://github.com/davidmyersdev/vite-plugin-node-polyfills) for this. Migration to `@solana/kit` (which removes these requirements
entirely) is on the roadmap.

---

## 5. Governance

### 5.1 Mechanism

BASIS DAO is a vanilla SPL Governance v3 realm. The realm public key,
governance public key, and treasury are all on-chain accounts. The
program is the same one used by Realms.today and a long list of other
Solana DAOs — proven, audited, mature.

### 5.2 Voting flow

```
1. User holds $BASIS in their wallet
2. User opens dao.databasis.info → connects wallet
3. User deposits $BASIS into the realm (creates a TokenOwnerRecord on-chain)
4. The deposited amount becomes voting weight
5. User casts vote on active proposals (yes/no/abstain)
6. Vote is signed in the user's wallet, sent to the SPL Governance program
7. On-chain tally updates immediately
8. When proposal expires, anyone can finalise it
9. If approved, anyone can execute the linked instructions
```

### 5.3 Parameters

| Parameter | Current value | How it changes |
|---|---|---|
| Min tokens to create proposal | 10,000,000 BASIS | DAO vote |
| Max voting time | (defined on-chain in realm config) | DAO vote |
| Quorum threshold | (defined on-chain in realm config) | DAO vote |
| NFT boost multiplier | 1.5× (UI advisory only, not on-chain enforced) | UI change |

### 5.4 Off-chain enrichment

Firestore stores rich proposal metadata (long-form descriptions,
images, links, comment threads) at `proposals-meta/{proposalId}`. This
is **non-binding**: if Firestore disagrees with the on-chain record,
on-chain wins. Firestore exists for human-readable context only.

### 5.5 What can be governed

- Treasury allocations from the DAO multisig
- Protocol parameter changes (proposal threshold, quorum, etc.)
- Ecosystem development priorities (which apps to build, in what order)
- Partnership decisions
- Brand/marketing direction
- Roadmap revisions

### 5.6 What cannot be governed

- The token contract itself (no mint/freeze/transfer authority — immutable)
- Pump.fun liquidity (permanently burnt)
- Custodial control over user funds (the DAO has no such control)
- Arbitrary code execution against user wallets

---

## 6. Burn economics

### 6.1 Why a burn tool exists

Every Solana wallet locks small amounts of SOL ("rent") inside token
accounts. Each empty token account holds ~0.002 SOL hostage. A wallet
that has interacted with thirty Pump.fun launches, dozens of airdrops,
and a few NFT mints typically has 0.05–0.5 SOL locked across these
accounts. That SOL is theirs — they just need to close the accounts to
get it back.

BASIS Burn ([burn.databasis.info](https://burn.databasis.info)) is the
tool that finds and recovers this for any wallet, free, with no fees.

### 6.2 What gets recovered

| Asset type | Action | SOL recovered |
|---|---|---|
| Empty SPL token account | Close | ~0.00203928 SOL each |
| Token account with dust | Burn balance + close | ~0.00203928 SOL each |
| Standard NFT | Burn metadata + close ATA | ~0.005 SOL each |
| Programmable NFT (pNFT) | Burn metadata + close | ~0.005 SOL each |
| MPL Core asset | Burn asset | ~0.0015 SOL each |
| Compressed NFT (cNFT) | Burn Merkle leaf | 0 SOL (no rent locked) |

The cNFT case is honest: cNFTs don't lock rent because they aren't
Solana accounts — they're leaves in a Merkle tree. Burning removes them
from your wallet but recovers no SOL. The UI says this clearly before
you sign.

### 6.3 Public counter

Every successful burn writes to a public Firestore counter at
`stats/recovered`:

```
{
  lamports:  <cumulative SOL recovered network-wide>
  burns:     <cumulative successful burn transactions>
  updatedAt: <server timestamp>
}
```

Firestore rules enforce:
- Increment-only updates (no decreases or rewrites)
- ≤ 10 SOL per single write (anti-abuse cap)
- Exactly +1 to `burns` per write (rate limit)
- Requires App Check token (prevents API abuse)

This means a malicious actor can at most inflate the network-recovered
total by 10 SOL per write while authenticated through reCAPTCHA — a
bounded cost.

### 6.4 Personal counter

Per-user burn history lives in browser localStorage at
`basis-burn:user-stats:<walletAddress>`. Capped at 60 entries with
defensive parsing. **Griefer-proof by construction**: nobody else can
write your localStorage key, and the counter has no on-chain or
cross-wallet dependencies.

### 6.5 Fee structure

**Zero.** No transaction fee, no commission, no premium tier, no
"sustainability tax." 100% of recovered SOL flows back to the user.
The project's revenue from this app is exactly $0; that's intentional.
Burn exists to attract users into the ecosystem, not to extract from
them.

### 6.6 Audit posture

Two independent security reviews completed pre-launch (2026-04-26).
Zero critical or high findings. Two low/info-severity items
(URL-scheme allow-list and a UX-only retry bug) were patched the
same day. Full audit memo in [SECURITY.md](./SECURITY.md).

---

## 7. Genesis NFT collection

| Attribute | Value |
|---|---|
| **Name** | BASIS Genesis |
| **Standard** | Metaplex Core |
| **Supply** | 50 (fixed, mint complete) |
| **Mint** | Historical, via Candy Machine |
| **Marketplaces** | [Magic Eden](https://magiceden.io/marketplace/basis) · [Tensor](https://www.tensor.trade/trade/basis) |
| **Status** | Live, secondary market |
| **Utility** | Reserved for future DAO-decided allocation |

### 7.1 Why 50

Genesis is a small, identifiable cohort. Supply is small enough that
holders are individually traceable on-chain and can be airdropped
specific utility (governance multipliers, exclusive Discord roles,
priority access to future drops, etc.) without diluting any future
larger-collection economics.

### 7.2 What utility means

Currently the collection's utility is "TBD by DAO governance." Possible
mechanisms (for the DAO to choose among, not commitments):

- Off-chain weight multiplier when voting (already 1.5× advisory in UI)
- Priority access to NFT Deployer features
- Exclusive in-game cosmetics or starting bonuses
- Revenue share if/when ecosystem revenue lines emerge

The collection will not be retroactively diluted, re-minted, or
sub-divided. The 50 supply is permanent.

---

## 8. Security model

### 8.1 Threat model overview

The most realistic threats to a BASIS user are, in descending order
of likelihood:

1. **Phishing via lookalike domains** — typo-squats on `databasis.info`
2. **Malicious browser extensions** that intercept wallet signatures
3. **Compromised RPC** returning manipulated data
4. **A hostile NFT/token's metadata** containing crafted URLs or scripts
5. **Replay or signature reuse** across the ecosystem's apps
6. **Operational take-overs** of the team's deployment pipeline

The threat model explicitly does **not** include "BASIS itself going
malicious" because BASIS owns no custodial infrastructure — there's
nothing to seize. Even a fully compromised deployment pipeline can at
worst push code that the user's wallet provider would still display in
its signing prompt.

### 8.2 Mitigations in place

| Threat | Mitigation |
|---|---|
| Phishing | Anti-phishing notice on Terminal token page; canonical URLs published in this whitepaper; contract address shown across all apps |
| Malicious extensions | Wallet adapter routes signing to the user's wallet provider, where signing UX is controlled by the wallet (not the dApp) |
| Compromised RPC | Domain-restricted Helius keys; defensive validation of all RPC responses (base58 regex on every public key before DOM interpolation) |
| Hostile metadata | URL allow-list (`http(s):` only) on every `<img src>` rendered from on-chain metadata; React text escaping everywhere else |
| Replay across apps | Each app has its own reCAPTCHA v3 site key + Firebase App Check registration; no shared signature surface |
| Op pipeline takeover | Multi-factor auth on GitHub + Google accounts; deployment workflows are public and reviewable; no production secrets in code repos (only env-injected at build time) |

### 8.3 Burn-specific security

The Burn app is the most security-sensitive application in the
ecosystem because it executes destructive on-chain operations. Per the
audit:

- All burn instructions use the connected wallet as authority and rent recipient
- The "raw NFT burn" fallback path explicitly validates `decimals === 0` and `supply === 1n` to prevent fungible tokens from flowing through the NFT-burn path
- A pre-burn review modal forces an explicit user confirm before any wallet popup is requested
- Retry logic resends identical signed bytes (idempotent — same txid; first landed copy wins)
- Failed transactions are filtered from default views

Full memo: [SECURITY.md](./SECURITY.md).

### 8.4 Governance-specific security

- Voting requires an on-chain wallet signature; Firestore enrichment cannot influence the on-chain tally
- The DAO has no sweep authority over user wallets
- The DAO treasury (when a treasury exists) will be a multisig with public membership

### 8.5 No custodial control

To restate clearly: **BASIS holds no user funds.** Every transaction is
signed by the user's own wallet. There is no hot wallet, no multisig
holding deposits, no smart contract escrow. The DAO treasury is the
only project-controlled account, and even that is on-chain-visible and
governance-controlled.

---

## 9. Risk disclosures

This section is honest about what could go wrong. Anyone holding
$BASIS or using ecosystem apps should read it.

### 9.1 Market risk

$BASIS price volatility is high. The token is small-cap, low-liquidity,
and subject to all the dynamics of any Solana memecoin: large holders,
sentiment-driven trades, and broader Solana / crypto market
correlation. Hold only what you can afford to lose entirely.

### 9.2 Smart contract risk

BASIS uses no custom contracts. The risks that remain are inherited from
Solana primitives we depend on:

- A discovered bug in SPL Governance v3 could affect the DAO. SPL Governance has been live and reviewed since 2021; risk is low but non-zero.
- A discovered bug in Metaplex Core / Bubblegum / Token Metadata could affect Burn or Deployer.
- A discovered bug in `@solana/web3.js` v1 could affect everything.

These are upstream risks shared across the entire Solana ecosystem.

### 9.3 Infrastructure risk

- **Firebase outages** would temporarily break chat, governance metadata reads, and the public burn counter. On-chain governance and burns continue working.
- **Helius outages** would break analytics + scanning until either Helius recovers or apps are pointed at a fallback RPC.
- **Domain hijack** of databasis.info would be catastrophic. The domain is registered with strong account security (2FA, registry lock).

### 9.4 Governance risk

- A coordinated whale or whale group could push proposals against minority-holder interest if they meet the 10M BASIS threshold. The mitigation is the proposal expiration window — minority holders have time to organise and counter-vote.
- The DAO treasury (once funded) is governed solely by token-weighted votes. Sufficient token concentration could redirect funds.

### 9.5 Operational risk

The project is small. Small teams have key-person risk. If primary
maintainers become unavailable, ecosystem development stalls until
governance reorganises maintenance. The repos are open-source and any
holder can fork; this is a recovery path, not a substitute for
continuity.

### 9.6 Regulatory risk

Token regulation is jurisdiction-dependent and evolving. BASIS makes no
representations about its regulatory treatment in any specific country.
Holders are responsible for their own compliance.

### 9.7 What is _not_ a risk

- **Rug pull.** The mint authority is revoked. No new tokens can ever be created. Liquidity is permanently burnt. Team allocation is zero. There is nothing to dump.
- **Custodial seizure.** The project holds no user funds.
- **Hidden fees.** Public-utility apps charge zero fees. The code is open source — verify yourself.

---

## 10. Open source and contribution

### 10.1 Licensing

All BASIS application code is released under an open-source license
(specific license per repo; check each repo's `LICENSE` file). The
`docs/` directory containing this whitepaper is released under
Creative Commons Attribution.

### 10.2 Contribution

Pull requests welcome at any of the public repos. The standard process:

1. Fork the relevant repo
2. Branch from `main`
3. Open a PR with a clear description of the change
4. CI runs (build, tests where applicable)
5. Maintainer review
6. Merge → automatic deployment

### 10.3 Disclosure

If you discover a security vulnerability, please report responsibly:

- For low/medium issues: open a GitHub issue
- For high/critical issues: contact the project privately via Telegram first; we will coordinate public disclosure after a fix is shipped

### 10.4 Evolution of this document

This whitepaper is a living document. Material changes (token mechanics,
governance parameters, security posture) will be versioned. Cosmetic
changes (typo fixes, link updates) will be silently committed. The
canonical version always lives at `docs/WHITEPAPER.md` in the
[basis monorepo](https://github.com/solbasis).

---

**Authored 2026-04-27. v1.0.**
*BASIS is software. The token coordinates the people who build and use it.*
