# BASIS — Security Architecture & Audit

> **Last updated:** 2026-04-27
> Audience: security researchers, careful holders, integrators.
> For a high-level summary, see [WHITEPAPER.md § 8](./WHITEPAPER.md#8-security-model).

This document describes the security architecture of the BASIS ecosystem
in enough detail that a researcher can review specific decisions. It
also publishes the audit trail for every app that handles user funds or
destructive operations.

---

## 1. Threat model

### 1.1 Assets to protect

| Asset | Owner | Loss scenario |
|---|---|---|
| User wallet private keys | The user | App leaks or exfiltrates the seed |
| User SOL / token balances | The user | App tricks user into signing a malicious transaction |
| Genesis NFTs | The user | App burns or transfers without authorization |
| Public burn counter integrity | DAO / community | Counter inflated to mislead users about ecosystem activity |
| DAO governance vote integrity | DAO / community | Vote spoofed or replayed |
| Chatroom community trust | Community | Spoofed messages, role/identity hijack |
| Project deployment pipeline | Maintainers | Pushed code that signs malicious instructions |

### 1.2 Adversaries

| Adversary | Capability | Likelihood |
|---|---|---|
| **Phishing operator** running typo-squat domains | Owns lookalike URLs, copies BASIS UI exactly | High |
| **Malicious browser extension** active in user's profile | Reads/modifies DOM, intercepts wallet calls | Medium |
| **Compromised RPC** or hostile MITM | Returns crafted account data, replays old responses | Low |
| **Malicious on-chain metadata creator** | Crafts token names, NFT images, descriptions to abuse rendering | Medium |
| **Pipeline-takeover attacker** with stolen GitHub credentials | Pushes code to a BASIS repo | Low |
| **Chain-level adversary** (51% attack, validator collusion) | Out of scope — Solana protocol risk | Very low |

### 1.3 Trust boundaries

Every BASIS app treats these boundaries as untrusted:

- Anything returned by Helius RPC, DAS, or enhanced API
- Anything stored in Firestore by another user (chat messages, profile fields, proposal metadata)
- Anything in on-chain account data (token names, NFT metadata, image URLs, descriptions)
- Anything in `localStorage` from a previous session
- Browser environment (extensions, page scripts that aren't ours)

What we do trust:

- The user's wallet provider (Phantom, Solflare, etc.) — its signing UX is the final-consent gate
- The Solana network's consensus
- Audited Solana programs (SPL Governance, Metaplex Core/Bubblegum/Token Metadata, SPL Token)
- Firebase's authentication and App Check enforcement (with our reCAPTCHA configurations)

---

## 2. Defense layers

The ecosystem is defended in depth — multiple independent layers, any
of which would have to fail for an attack to succeed.

### 2.1 No custodial control

Nothing the project operates can sweep, freeze, or transfer user funds.

- The token mint authority is **revoked** (verifiable on [Orb](https://orbmarkets.io/token/A5BJBQUTR5sTzkM89hRDuApWyvgjdXpR7B7rW1r9pump))
- The token freeze authority is **revoked**
- The DAO has no authority over external user wallets — only over its own treasury
- No project-operated hot wallet exists at scale

### 2.2 No custom on-chain programs

Every Solana operation routes through audited primitives. The
attack surface a typical Solana dApp adds — its own program — is
absent here. See [WHITEPAPER.md § 4.1](./WHITEPAPER.md#41-the-deliberate-no-custom-contracts-stance).

### 2.3 Wallet-adapter signing

Every app uses the [Solana Wallet Standard](https://github.com/solana-mobile/wallet-standard).
The app prepares a transaction, hands it to the wallet provider, and the
wallet provider — running in its own secure context — shows the user
what they're signing. **The app never sees the private key.**

This means even a fully compromised BASIS deployment can at worst push
*malicious instructions to the user's wallet*. The wallet's own UX is
the last line of defense.

### 2.4 Pre-burn review modal (Burn-specific)

Destructive operations (burns) have an extra defense layer beyond the
wallet popup: a project-controlled review modal that lists exactly what
will be processed before the wallet popup is requested at all. A
misclick on the burn button cannot reach signing without the user
explicitly confirming counts and recoverable SOL.

### 2.5 URL-scheme allow-list on rendered metadata

On-chain metadata (token logos, NFT images, descriptions) is treated as
hostile input. Only `http(s):` URLs reach `<img src>`; `data:`, `blob:`,
`file:`, `javascript:` schemes are silently rejected. Defense-in-depth
on top of the browsers' own `<img>` script-execution refusal.

### 2.6 Validation on every base58 string

Any address or signature pulled from RPC / DAS responses is validated
against a strict regex (`/^[1-9A-HJ-NP-Za-km-z]{32,90}$/`) before being
interpolated into the DOM. Per the
[solana-dev skill's "treat on-chain data as untrusted"](../basis/.claude/skills/solana-dev) guidance.

### 2.7 React text escaping (no `dangerouslySetInnerHTML`)

Token names, NFT names, mint addresses, descriptions — all rendered as
React text children. React escapes by default. There is no
`dangerouslySetInnerHTML` anywhere in the React-based apps (verified
via grep on every commit).

### 2.8 Firebase App Check enforcement

Firestore is protected by reCAPTCHA v3 App Check. Every read/write must
carry a valid App Check token, minted from a per-app site key
restricted to that app's specific subdomain. A token issued for
`burn.databasis.info` cannot be used to read `chat.databasis.info`'s
collections. Each app has its own Firebase web app registration in App
Check, with its own site key + secret pair — no shared signature
surface.

### 2.9 Server-side message sanitisation (Chat)

The chatroom's `sanitiseMessage` Cloud Function fires on every new
message and overwrites the `name`, `role`, `color`, and `avatarUrl`
fields against the sender's actual `users/{uid}` document. A
compromised client cannot post a message claiming to be from someone
else — the server replaces the lie before any reader sees it.

### 2.10 Firestore rules — least privilege

Rules are organized per-collection with explicit deny defaults. Notable
constraints:

| Collection | Rule |
|---|---|
| `messages` | uid must match `request.auth.uid`; muted users blocked from create; only mod+ can post as bot |
| `users` | each user updates only their own profile; mod+ can mute others; admin+ can kick/promote (cannot promote >= own rank) |
| `dm-channels` | participant-gated reads; immutable history |
| `bans` | admin-only writes |
| `bot-state`, `alerts` | server-only (Admin SDK) writes |
| `votes` | write-once per `voteId`; signature required; weight + choice validated |
| `proposals` | strict shape on create; only specific fields can change on update |
| `stats/recovered` | increment-only; ≤ 10 SOL per write; exactly +1 to `burns`; create/delete blocked |
| Default | `allow read, write: if false` |

### 2.11 Domain-restricted RPC keys

Each app's Helius API key has its destination domain registered in the
Helius dashboard. A key extracted from `burn.databasis.info`'s bundle
cannot be used from `evilsite.com` to drain BASIS's rate-limit budget —
Helius rejects the request at the edge.

### 2.12 Idempotent transaction retry

`sendRawWithRetry` resends identical signed bytes. The transaction's
canonical signature is stable across retries (Solana's first-signature
== txid convention). If a retry sees `AlreadyProcessed`, we return the
known signature instead of throwing — the original landed and the user
gets confirmation. There is no path that submits a re-signed
duplicate transaction.

### 2.13 Reduced-motion + accessibility-respecting defaults

While not security per se: every animated/transitioned element respects
`prefers-reduced-motion`, ensuring users on assistive tech don't get
their UX disrupted in ways that might mask real warnings.

---

## 3. Application-by-application audit posture

### 3.1 BASIS Burn — audited (highest scrutiny)

**Audit dates:** 2026-04-26
**Reviewers:** two independent passes (one human + one specialised security agent)
**Findings:**

| Severity | Count | Status |
|---|---|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 2 | Both patched same day |
| Informational | 11 | Documented; no action needed |

**Patched low items:**

1. **Image URL scheme allow-list** — added `safeUrl()` helper that rejects non-http(s) URLs before reaching `<img src>`. Defense-in-depth.
2. **Retry UX bug** — `AlreadyProcessed` retry now returns the canonical txid instead of throwing. UX-only fix; no fund risk.

**Defensive properties verified:**

- Authority on every burn/close instruction = `wallet.publicKey` (the connected user)
- Rent destination on every close = `wallet.publicKey`
- Fee payer = `wallet.publicKey`
- `programId` on close instructions read from on-chain `account.owner` (not user-controlled)
- Raw-NFT-burn fallback explicitly enforces `mintInfo.decimals === 0 && mintInfo.supply === 1n` before building burn instruction (prevents fungibles being torched through that code path)
- cNFT burns: even if Helius DAS returns a malicious Merkle proof, the on-chain Bubblegum program verifies leaf ownership against `wallet.publicKey` — you cannot burn someone else's leaf
- Idempotent retry: same signed bytes, same txid; AlreadyProcessed treated as success
- Pre-burn review modal: explicit confirm before any wallet popup is requested

**Audit memos:** see git history at `databasis-burn` repo, commits `9221418` and `b609a18`.

### 3.2 BASIS DAO — code-reviewed, no formal external audit yet

The DAO is built on SPL Governance v3, which has been audited by Anza /
Solana Foundation. The BASIS layer on top is a thin client — instruction
building, signing, and Firestore enrichment. No custom on-chain logic.

**Risk areas:**
- Manual instruction building in `realm.js` (potential for incorrect account ordering)
- Off-chain enrichment in Firestore — non-binding, but UI consumers should never treat Firestore as authoritative for vote results
- NFT boost is advisory-only; actual on-chain vote weight is whatever SPL Governance says

**Mitigations in place:**
- Comprehensive code comments on every instruction builder explaining account roles
- The Firestore-enrichment trust model is documented in code

**Roadmap item:** seek a formal external audit (Halborn / OtterSec) before any treasury operations begin.

### 3.3 BASIS Chat — code-reviewed

**Risk areas:**
- Untrusted user input in messages (XSS, link manipulation, spam)
- Identity spoofing (claim to be someone else)
- Role escalation (claim higher privilege than actually granted)
- Persistent state in Firestore observed by other users

**Mitigations in place:**
- All user message content rendered through `esc()` (HTML-entity encoding) and `formatMessage()` (selective whitelist of allowed inline syntax: code, bold, links, mentions)
- Server-side `sanitiseMessage` overwrites identity fields on every write
- Firestore rules enforce `uid == request.auth.uid` on creates
- Role rank comparison built into rules (`isAtLeast`); admins cannot grant role >= own rank
- Soft-delete admin action keeps moderation visible (no silent deletions)

**Open items:**
- Wallet-verified badges (Phase 1) will add a wallet-signature challenge before identity claim — currently identity is Firebase-Auth-only

### 3.4 BASIS Bot — sandboxed

The Telegram bot runs server-side, Python-only, no on-chain signing.
Risks are operational rather than user-fund-related:

- API key for Helius: stored in environment variables, never committed
- API key for Telegram: stored in environment variables
- Groq API key: stored in environment variables
- `known_holders.json` persistence: read by bot only; if file is corrupted, bot rebuilds from chain history

**Mitigations:** standard 12-factor environment-variable practice. No
secrets in code. The bot has no authority to move user funds — it can
only post Telegram messages.

### 3.5 NFT Deployer — third-party-trust-dependent

The deployer signs Metaplex Candy Machine creation transactions on
behalf of the user. Risks:

- Irys (Bundlr) uploader: trusted to publish metadata to Arweave
- Metaplex Core + Candy Machine: trusted programs (audited upstream)
- User-provided creator addresses: validated via base58 regex before being interpolated into instructions

**Defensive property:** the deployer uses Umi's standard transaction
flow — every instruction is built by the Metaplex SDK, not
hand-rolled. Less surface for instruction-construction bugs.

### 3.6 Other apps — read-only or sandboxed

- **Terminal** — read-only, no wallet connection, no signing path
- **Game** — pure client-side, no backend, no wallet operations
- **Art** — pure client-side, no backend, no wallet operations
- **Backend** — server-only, no client-facing surface

These apps cannot harm a user's funds because they don't touch any.

---

## 4. Disclosure & response

### 4.1 Reporting a vulnerability

If you discover a security issue:

| Severity | How to report |
|---|---|
| Low / informational | Open a public GitHub issue in the affected repo |
| Medium | Open a private security advisory on the affected repo (`Security` tab → `Report a vulnerability`) |
| High / critical | Contact the team privately via Telegram first ([@solbasis](https://t.me/solbasis)). We will coordinate a fix and public disclosure timeline |

### 4.2 Response commitment

- Acknowledgement within 48 hours of report
- Fix or mitigation deployed within 5 business days for critical issues
- Public disclosure 30 days after the fix ships (or sooner if the issue is already public)

### 4.3 Bug bounty

There is no formal bug bounty program at this time. The DAO may
authorize a treasury-funded bounty pool in Phase 2 once a treasury
exists. In the interim, valid critical / high findings will be
acknowledged publicly with the reporter's permission.

### 4.4 Hall of fame

Reserved for security researchers who responsibly disclose findings.
List will be maintained in this section as discoveries occur.

*(empty — no reports yet)*

---

## 5. What we do not yet have

Honest about gaps. These are areas where the project's security posture
is improvable, in priority order:

1. **No formal external audit of the DAO interface** — planned Phase 2, before any treasury operation
2. **No bug bounty program** — planned Phase 2 once treasury can fund it
3. **No SRI hashes on bundled JS** — planned Phase 1 (cheap to add)
4. **No public status page** — planned Phase 1
5. **No formal incident response runbook** — would be useful for the Telegram bot's Helius/Telegram outages
6. **Burn app has not undergone a third-party audit firm review** — two internal independent reviews (one human + one specialised agent) found no critical/high issues, but a name-brand external audit would be ideal pre-treasury-integration

---

## 6. References

- [BASIS Whitepaper](./WHITEPAPER.md)
- [BASIS Roadmap](./ROADMAP.md)
- [Project Overview](./OVERVIEW.md)
- [SPL Governance v3 program](https://github.com/solana-program/governance) (program ID: `GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw`)
- [Metaplex Core](https://github.com/metaplex-foundation/mpl-core)
- [Metaplex Bubblegum](https://github.com/metaplex-foundation/mpl-bubblegum)
- [Solana Wallet Standard](https://github.com/solana-mobile/wallet-standard)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Helius docs](https://docs.helius.dev/)

---

**Authored 2026-04-27 · v1.0**
*If you found this document useful or found a flaw in our security
posture, please get in touch.*
