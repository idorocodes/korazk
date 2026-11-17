# KoraZK

**Prove the facts that matter, without handing over the documents behind them.**

KoraZK is a privacy tool built on [Solana](https://solana.com). It lets you prove something about your money or identity, such as "I earn more than ₦400,000 a month" or "I hold a valid NIN", without showing your bank statement, your account number, or your ID number.

You type what you want to prove in plain English. KoraZK does the cryptography for you and gives back a small proof that anyone can check instantly.

---

## The Problem, in Plain Words

Today, proving something about yourself usually means handing over everything.

- Applying for a loan? You send **six months of full bank statements**, even though the lender only needs to know your income is above a certain level.
- Renting a flat? The landlord wants your statements, your BVN, your NIN, and a copy of your ID.
- Signing up for a service? You upload an ID document and hope it is stored safely.

Every time you do this, your private data sits in someone else's email inbox, database, or WhatsApp chat. If they are hacked or careless, your data leaks.

**KoraZK fixes this.** You prove only the one fact that is needed, and nothing else leaves your device.

---

## What You Can Prove

Here are three examples of what you can type:

| You type | What the other person learns | What stays private |
| --- | --- | --- |
| *"Prove my monthly inflow exceeds ₦400,000"* | Your income is above ₦400,000 | Your exact income, your account number, every transaction |
| *"Prove I sent ₦150,000 on Nov 14"* | That one payment really happened | Your balance, your other transactions, the rest of your statement |
| *"Prove I hold a valid NIN"* | You have a real, verified NIN | The NIN itself, your BVN, your personal details |

No BVN or NIN numbers, account numbers, or raw PDF bank statements are ever stored on the blockchain or kept on a backend server.

---

## How It Works: A Simple Analogy

Imagine you need to show a bouncer you are over 18.

- **The usual way:** you hand over your full ID. He now sees your name, address, date of birth, and ID number.
- **The KoraZK way:** a trusted official stamps a sealed card that says only "this person is over 18". The bouncer can confirm the stamp is real, but learns nothing else about you.

KoraZK does the same thing for money and identity, using a branch of mathematics called **zero-knowledge proofs**. A zero-knowledge proof lets you convince someone that a statement is true without revealing why it is true or any of the data behind it.

---

## The Four Steps

```text
1. ASK       You type a plain-English claim.
                │
2. CHECK     A server confirms your data is real (for example, with your bank
             or ID provider), signs a stamp of approval, then forgets your data.
                │
3. PROVE     Your own browser turns that into a tiny cryptographic proof.
             Your private details never leave your device.
                │
4. VERIFY    The Solana blockchain checks the proof in a fraction of a second.
             Anyone you share the proof link or QR code with can trust it.
```

### Step by step

1. **Ask (Intent).** You enter a claim in the KoraZK app, for example *"Prove income > ₦400k"*. There are no forms or technical settings.
2. **Check (Attest).** A small server, called the **attestor**, looks at the real data from a provider such as Mono or Dojah. It confirms the data is genuine and signs a digital stamp saying so. It does all of this in temporary memory and **immediately deletes your raw data**. Nothing is saved.
3. **Prove.** Your browser takes that stamp together with your private details and builds a **proof**. This happens **on your device**. Your private details never get sent anywhere.
4. **Verify.** The proof is only **256 bytes**, smaller than a short text message. The Solana blockchain checks it in a single quick operation that costs about 77,000 "compute units", which is very cheap. It also records a one-time marker so the same proof cannot be misused.

---

## Why Solana?

Solana has built-in tools for checking this exact kind of proof, called `alt_bn128` syscalls. Because those tools are part of the blockchain itself, checking a proof is fast and cheap, and the cost stays the same no matter how complicated the original claim was.

---

## What's Inside This Project

KoraZK has three parts that work together:

```text
korazk/
├── korazk/              # The app people use (website)
├── korazk-circuit/      # The "rules" of what can be proven (the math)
└── server/              # The stamp-of-approval service (the attestor)
```

| Folder | What it is, simply | Built with |
| --- | --- | --- |
| **`korazk/`** | The website you interact with. It understands your plain-English request, builds the proof inside your browser so private data stays on your device, and creates shareable proof links and QR codes. | TypeScript, Next.js, WebAssembly (WASM) |
| **`korazk-circuit/`** | The rulebook. A "circuit" is the mathematical recipe for one kind of proof, such as "this number is above that number". This folder defines the recipes and produces the code that Solana uses to check proofs. | Rust (using `xark`), `no_std` Solana verifier |
| **`server/`** | The attestor. It checks that the data from your bank or ID provider is real, signs a digital stamp, and then wipes the raw data from memory. It never stores personal information. | Rust (Axum) |

The server connects to providers such as **Mono, Okra, Dojah, Paystack, and Monnify**.

---

## What the Circuits Can Do

These are the building blocks of KoraZK, explained without jargon.

### 1. "Above or below" proofs (Range and Threshold)
Prove that a private number is above a public limit, without revealing the number.
*Example: your balance is over ₦500,000, your monthly inflow is over ₦400,000, or you are 18 or older.*

### 2. "This one payment happened" proofs (Selective Statement Inclusion)
Your bank's transactions are bundled together and signed. KoraZK lets you prove that **one specific payment** is in that signed bundle, without exposing your balance or any other transaction. This works through a structure called a **Merkle tree**, which you can think of as a tamper-proof table of contents for your statement.

### 3. "I'm real, and I'm only counted once" proofs (Identity and Uniqueness)
Prove you have a valid, verified identity such as a NIN. KoraZK also produces a **nullifier**, a unique but anonymous fingerprint. It stops the same identity from being used twice (so no fake or duplicate accounts), but it cannot be traced back to who you are.

### 4. "This proof is for this wallet only" (Wallet-Bound Receipts)
Every proof is tied to a specific Solana wallet address. If someone intercepts it, they cannot reuse it or redirect it to themselves.

---

## Privacy and Security Promises

- **Your private data stays on your device.** Exact balances, bank rows, NIN/BVN details, and personal secrets are only used inside your own browser.
- **The server remembers nothing.** The attestor handles data only in temporary memory and never saves bank statements or personal information.
- **Proofs are tiny and cheap to check.** Every proof is exactly **256 bytes** and verifies on Solana at a constant cost (about 77k compute units), using a well-established proof system called **Groth16** over the **BN254** curve.
- **Proofs can't be stolen or replayed.** Wallet binding and nullifiers stop others from reusing or redirecting your proof.

---

## Getting Started (for Developers)

> This section is for people who want to run KoraZK on their own computer.

### What you need first

- **Rust** `1.89+` (tested with `v1.99.1`), with the `wasm32-unknown-unknown` target added
- **xark CLI:** `cargo install xark-cli`
- **Solana toolchain:** the Anza / Agave CLI (`cargo-build-sbf`)
- **Node.js** `v20+` (for the website and the LiteSVM tests)

Check that your setup is ready:

```bash
xark doctor
```

### 1. Build and test the circuits (`korazk-circuit/`)

```bash
cd korazk-circuit

# Build the circuits and run the Rust tests
xark test

# Build the circuits, the Solana verifier, and the TypeScript prover
xark build
```

> **Note:** `xark build` regenerates the Solana verifier crate and the TypeScript/WASM client that the website uses. Commit the generated `keys/` folder so everyone stays consistent on devnet. Before any **mainnet** launch, run a multi-party `xark ceremony` (a secure setup process where several independent people contribute randomness, so no single person can cheat the system).

### 2. Run the attestor server (`server/`)

```bash
cd server
cp .env.example .env   # Add your Ed25519 signing key and sandbox API keys
cargo run
```

### 3. Run the website (`korazk/`)

```bash
cd korazk
npm install
npm run dev
```

---

## Glossary

| Term | Meaning in plain English |
| --- | --- |
| **Zero-knowledge proof** | A way to prove a statement is true without revealing the information that makes it true. |
| **Groth16** | The specific proof system KoraZK uses. It produces very small proofs that are quick to check. |
| **Circuit** | The mathematical recipe that defines what a proof is allowed to say. |
| **Witness / private input** | The secret data you prove things about (your balance, your NIN). It never leaves your device. |
| **Attestor** | The server that confirms your data is real, signs a stamp, and forgets the data. |
| **Merkle tree** | A tamper-proof way to bundle many records so you can prove one of them exists without showing the rest. |
| **Nullifier** | An anonymous one-time fingerprint that stops the same proof or identity being used twice. |
| **WASM (WebAssembly)** | Technology that lets heavy computation run fast inside your web browser. |
| **Compute units (CU)** | Solana's measure of how much work a transaction takes. Fewer is cheaper. |
| **Devnet / Mainnet** | Devnet is Solana's practice network. Mainnet is the real one with real money. |

---

## Frequently Asked Questions

**Does KoraZK store my bank statement or ID number?**
No. They are never stored on the blockchain, and the server only holds them briefly in memory before discarding them.

**Who can see my data when I share a proof?**
The person you share it with sees only the claim being proven (for example, "income is above ₦400,000"). They do not see your account number, balance, or other transactions.

**Can someone copy my proof and use it as their own?**
No. Each proof is tied to a specific Solana wallet address, and identity proofs carry a nullifier that blocks reuse.

**Do I need to understand cryptography to use it?**
No. You type a sentence in plain English and the app handles the rest.

**Is it expensive to verify a proof?**
No. Verification takes about 77,000 compute units on Solana, and the cost does not grow with the complexity of the claim.

---

## License

MIT
