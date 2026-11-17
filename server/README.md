# KoraZK Attestor Server (`server`)

**The stateless stamp-of-approval service behind KoraZK, built with Express.js.**

Zero-knowledge circuits can prove math—such as *"this number is greater than ₦400,000"*—but a circuit cannot call a Nigerian bank API or look up a NIN on its own. That is what this server does.

The **Attestor** acts as a temporary, zero-storage bridge between real-world Nigerian data providers (like Mono, Okra, Dojah, Paystack, and Monnify) and the user's browser prover. It checks that the underlying financial or identity data is real, signs a cryptographic stamp of approval (**Ed25519 signature**), hands that signed payload back to the user's browser, and **immediately deletes all raw personal data from memory**.

---

## Core Design Principles

1. **Zero Persistence (No Database of User PII):** This server has no database tables for bank statements, account numbers, BVN/NIN strings, or user balances. Everything is processed in volatile request memory and discarded as soon as the signed attestation leaves the endpoint.
2. **Intent Routing:** Translates plain-English user prompts (e.g., *"Prove my monthly income is over ₦400k"*) into structured circuit identifiers and threshold parameters for the frontend.
3. **ZK-Friendly Signing:** Web2 providers return standard JSON payloads or webhooks (`HMAC-SHA512` / RSA). The attestor verifies those upstream responses, normalizes the relevant fields into field elements or a Merkle tree, and signs the commitment with an **Ed25519 key** that `korazk-circuit` can verify cheaply inside Groth16.

---

## Directory Layout

```text
server/
├── src/
│   ├── index.ts               # Express app entry point, middleware, and security headers
│   ├── routes/
│   │   ├── intent.ts          # Natural-language prompt -> circuit & parameter parser
│   │   ├── attest.ts          # Endpoints for income, balance, NIN, and tx-inclusion stamps
│   │   └── webhooks.ts        # Paystack / Monnify / Mono webhook handlers
│   ├── providers/
│   │   ├── mono.ts            # Mono Connect (account info, income, transactions)
│   │   ├── dojah.ts           # Dojah identity checks (NIN, BVN, DOB)
│   │   └── payments.ts        # Paystack / Monnify transfer confirmation checks
│   └── crypto/
│       ├── signer.ts          # Ed25519 attestation signer (matches xark circuit gadget)
│       └── merkle.ts          # Builds transaction Merkle trees for selective statement proofs
├── .env.example               # Environment variable template
├── package.json
└── tsconfig.json

```

---

## How an Attestation Request Works

```text
User Browser (`korazk/`)                     Attestor (`server/`)                   Web2 Provider
         │                                            │                                   │
         ├── 1. POST /api/intent ("Prove > ₦400k") ──►│                                   │
         │◄─ 2. Returns { circuit: "range_check" } ───┤                                   │
         │                                            │                                   │
         ├── 3. POST /api/attest/income (auth_code) ─►├── 4. Fetch income / tx data ─────►│
         │                                            │◄── 5. Verified JSON response ─────┤
         │                                            │                                   │
         │                                            ├── 6. Hash & sign claim (Ed25519)  │
         │                                            ├── 7. Wipe raw response from RAM   │
         │◄─ 8. Signed witness payload ───────────────┤                                   │
         │                                            │                                   │
         └── 9. Runs `xark` WASM prover locally ──► Outputs 256-byte proof

```

---

## API Endpoints

### `POST /api/intent`

Parses a plain-English request into a KoraZK circuit template and public parameters.

* **Request:** `{ "prompt": "Prove I sent ₦150,000 on Nov 14" }`
* **Response:** `{ "circuit": "tx_inclusion", "params": { "amount": 150000, "date": "2026-11-14" }, "provider": "mono" }`

### `POST /api/attest/range`

Fetches verified monthly inflow or account balance from Open Banking (Mono/Okra) and returns an Ed25519-signed claim for the `range_check` circuit.

* **Request:** `{ "provider": "mono", "accountId": "..." }`
* **Response:** `{ "value": "650000", "timestamp": 1794918360, "signature": "0x...", "attestorPubkey": "0x..." }`

### `POST /api/attest/transactions`

Fetches recent bank transactions, hashes each row (`date`, `amount`, `reference`, `narration`), builds a **Merkle tree**, signs only the **Merkle root**, and returns the tree + signature so the user's browser can generate a `tx_inclusion` proof for one single row.

* **Request:** `{ "provider": "mono", "accountId": "..." }`
* **Response:** `{ "merkleRoot": "0x...", "rows": [...], "proofs": [...], "signature": "0x..." }`

### `POST /api/attest/identity`

Verifies NIN or age status via Dojah/Prembly and returns a signed verification flag (`kycStatus = 1`) so the browser can derive an anonymous `nullifier` locally.

* **Request:** `{ "provider": "dojah", "nin": "..." }`
* **Response:** `{ "kycStatus": 1, "isOver18": true, "signature": "0x..." }`

### `GET /api/attestor-key`

Returns the server's public Ed25519 key so frontends and Solana verifiers can confirm which attestor signed a claim.

---

## Setup & Local Development

### Prerequisites

* **Node.js** `v20+`
* **pnpm**
* Sandbox API keys from **Mono** (`https://docs.mono.co`) and **Dojah** (`https://sandbox.dojah.io`)

### Installation

```bash
cd server
pnpm install
cp .env.example .env

```

### Environment Variables (`.env`)

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# Ed25519 private key (32-byte hex) used to sign attestations for xark circuits
ATTESTOR_ED25519_PRIVATE_KEY=your_32_byte_hex_private_key

# Open Banking (Mono)
MONO_SECRET_KEY=test_sk_...

# Identity Verification (Dojah)
DOJAH_APP_ID=...
DOJAH_SECRET_KEY=...

# Payment Webhooks (Paystack / Monnify)
PAYSTACK_SECRET_KEY=sk_test_...

# AI Intent Parser (optional — falls back to deterministic keyword parser)
GEMINI_API_KEY=...

```

### Run in Development

```bash
pnpm dev

```

The server starts on `http://localhost:5440` with hot-reload enabled.

---

## Security & Privacy Rules for Contributors

* **Never log request bodies or provider payloads:** Disable verbose HTTP body logging on all `/api/attest/*` routes so NINs, account IDs, and bank transactions never end up in stdout, Docker logs, or APM traces.
* **Keep the Attestor Stateless:** Do not add Redis caches, SQLite files, or database writes for attestation payloads.
* **Strict CORS & Rate Limiting:** Lock CORS strictly to `FRONTEND_ORIGIN` and enforce rate limits on identity/banking endpoints to prevent upstream API credit abuse.
* **Key Rotation:** The `ATTESTOR_ED25519_PRIVATE_KEY` pairs directly with the public key expected by `korazk-circuit`. If you rotate this key, update the public key constant in your circuit configuration and re-run `xark build`.

---

## License

MIT

