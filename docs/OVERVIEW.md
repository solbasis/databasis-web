# BASIS — Project Overview

> An open ecosystem for the $BASIS token on Solana — analytics, governance,
> tooling, and community, all under one terminal-aesthetic banner.

**Token**       `A5BJBQUTR5sTzkM89hRDuApWyvgjdXpR7B7rW1r9pump` · Solana mainnet
**Supply**      1,000,000,000 BASIS · 100% liquidity burnt
**Origin**      Pump.fun launch · Fair launch, no team allocation
**Domain**      [databasis.info](https://databasis.info)

---

## What BASIS is

BASIS is a self-funded, open-source ecosystem of nine production apps built
around a single fair-launched Solana token. Each app is a real piece of
software — not a roadmap promise — designed to give holders something to
*do* with $BASIS beyond holding it.

The ecosystem ships with a coherent identity (terminal/CRT aesthetic across
every surface), a single Firebase backend, and zero custom on-chain
contracts — every Solana operation routes through audited, well-known
programs (SPL Governance, Metaplex Core, Candy Machine, SPL Token).

## The nine apps

| # | App | Subdomain | What it does |
|---|---|---|---|
| 1 | **BASIS Terminal**   | [databasis.info](https://databasis.info)            | Real-time price/volume/holder analytics for $BASIS, ecosystem hub |
| 2 | **BASIS Burn**       | [burn.databasis.info](https://burn.databasis.info)  | Recovers SOL from any wallet's empty token accounts, dust tokens, NFTs and cNFTs |
| 3 | **BASIS DAO**        | [dao.databasis.info](https://dao.databasis.info)    | On-chain governance via SPL Governance v3 — propose, vote, execute |
| 4 | **BASIS Chat**       | [chat.databasis.info](https://chat.databasis.info)  | Real-time moderated terminal chatroom for the community |
| 5 | **DeFi Tower Defense** | [game.databasis.info](https://game.databasis.info) | 7-stage tower-defense game where you protect a DeFi protocol from rug pullers, MEV bots, and 51% attackers |
| 6 | **BASIS Art**        | [art.databasis.info](https://art.databasis.info)    | Browser-based pixel + ASCII art studio with CRT shader, animation timeline, GIF export |
| 7 | **NFT Deployer**     | [deployer.databasis.info](https://deployer.databasis.info) | Six-step wizard to deploy NFT collections + Candy Machine on Solana |
| 8 | **BASIS Bot**        | Telegram                                            | Real-time buy alerts, top-buyer leaderboard, raid detection, AI commentary |
| 9 | **BASIS Backend**    | (no UI)                                             | Firebase Cloud Functions — message sanitisation, role enforcement, server-side validation |

Each is independently deployed (its own subdomain, its own GitHub Actions
workflow) and independently maintainable.

## How $BASIS is used today

- **Governance weight** — token deposits convert to on-chain voting power via SPL Governance. Minimum **10,000,000 BASIS** to create proposals.
- **In-game economy** — DeFi Tower Defense uses $BASIS as the in-game currency for placing and upgrading defensive towers. Earnings from defeated enemies pay forward into more towers.
- **Buy detection** — basis-bot watches the chain in real-time for $BASIS purchases and posts to Telegram with smart commentary.
- **Holder coordination** — chat.databasis.info gives holders a moderated space to discuss and coordinate.

**What it is not used for (deliberately):** gating any of the public utility tools.
The Burn app, Art studio, NFT deployer, Terminal, and Chat are all
free-to-use regardless of whether you hold $BASIS — they exist to attract
users, not extract from them.

## Architecture in one paragraph

Front-ends are mostly Vanilla JS (one React app: Burn). Solana RPC + DAS
served by Helius. Firestore stores everything off-chain (chat, governance
metadata, public counters) with rules deployed exclusively from
`basis-backend`. Wallet signing via the Solana Wallet Standard. Firebase
App Check (reCAPTCHA v3) enforces token-gated Firestore access. No custom
on-chain programs — only audited Solana primitives.

## Status — production live

All nine apps are live on mainnet as of 2026-04-27. The most recent
addition (Basis Burn) shipped 2026-04-26 with two independent security
reviews (no critical or high findings).

## Where to learn more

- **[Whitepaper](./WHITEPAPER.md)** — full technical + economic deep-dive
- **[Roadmap](./ROADMAP.md)** — what's shipped, what's next, what's vision
- **[Security](./SECURITY.md)** — threat model, audits, security architecture

## Contact & community

- X: [@solbasis](https://x.com/solbasis)
- Telegram: [@solbasis](https://t.me/solbasis)
- GitHub: [github.com/solbasis](https://github.com/solbasis)
- Verify the official $BASIS contract address on Dexscreener, Orb, and Pump.fun before interacting. Anti-phishing first.
