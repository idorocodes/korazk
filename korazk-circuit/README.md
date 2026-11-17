# KoraZK Circuits (`korazk-circuit`)

**The mathematical rulebooks behind KoraZK, written in Rust and compiled with `xark`.**

This directory contains the zero-knowledge circuits that define what KoraZK can prove—without ever revealing the private data behind those proofs. Using [xark](https://github.com/blueshift-gg/xark), these Rust functions compile down into:

1. **A browser prover (WASM + TypeScript):** Runs locally on the user's device to generate a **256-byte Groth16 proof**.
2. **A Solana verifier (`no_std` Rust crate):** Runs inside our Solana program to check proofs in ~77,000 compute units via Solana's native `alt_bn128` syscalls.

---

## How a Circuit Works (In Plain English)

A **circuit** is not a program that fetches data or stores balances—it is strictly a **set of rules** (`require_eq`, range checks, signature checks).

Every circuit splits its inputs into two groups:

- **`Private<Field>` (The Witness):** Secrets known only to the user—such as an exact bank balance, a NIN hash, a transaction row, or a personal secret. These never leave the user's browser.
- **`Public<Field>` (The Claim):** The facts visible to everyone and checked by Solana—such as a minimum income threshold (`₦400,000`), a recipient Solana wallet address, or a one-time `nullifier`.

If the private inputs satisfy every rule in the circuit, the prover outputs a **256-byte cryptographic seal (proof)**. If even one rule fails, no valid proof can be created.

---


## The Four Core Circuits

### 1. Range & Threshold (`range_check`)

Proves that a private number is greater than or equal to a public threshold without revealing the exact number.

* **Private inputs:** `actual_value` (e.g., monthly inflow or age), `attestor_signature`
* **Public inputs:** `min_threshold` (e.g., `400000` or `18`), `attestor_pubkey`, `recipient_wallet`
* **Rule enforced:** `actual_value >= min_threshold` and the value was genuinely signed by the KoraZK attestor.

### 2. Selective Bank Statement Inclusion (`tx_inclusion`)

Proves that a single payment row exists inside an authentic bank statement without revealing account balances or sibling transactions.

* **Private inputs:** `tx_row` (amount, date, reference), `merkle_path` (sibling hashes), `attestor_signature`
* **Public inputs:** `merkle_root`, `expected_amount`, `expected_reference_hash`, `recipient_wallet`
* **Rules enforced:**
1. `tx_row` hashes cleanly up to `merkle_root`.
2. `merkle_root` carries a valid Ed25519 signature from the attestor.
3. The row's amount and reference match the public claim.



### 3. Identity & Uniqueness (`identity_nullifier`)

Proves a user holds a verified Nigerian identity (such as a valid NIN via Dojah/Prembly) while preventing duplicate claims.

* **Private inputs:** `identity_secret`, `kyc_status`, `attestor_signature`
* **Public inputs:** `nullifier`, `recipient_wallet`
* **Rules enforced:**
1. `kyc_status == 1` (verified).
2. `nullifier == hash(identity_secret, app_scope)` — producing an anonymous, deterministic fingerprint that Solana records to prevent reuse without learning who the user is.



### 4. Wallet-Bound Receipt (`wallet_binding`)

Every KoraZK circuit includes `recipient_wallet` as a public input. Because Groth16 mathematically welds the 256-byte proof to all public inputs, nobody who intercepts a proof in transit can redirect it to another wallet.

---

## Common Commands

Run all commands from inside `korazk-circuit/`:

### Check Toolchain Health

```bash
xark doctor

```

### Run Circuit Unit Tests

Tests the circuit rules directly in Rust (fast feedback before generating keys or proofs):

```bash
xark test

```

### Generate Keys & Test a Local Proof

Solves the witness and produces a 256-byte proof from sample JSON inputs:

```bash
xark prove --inputs '{"secret": 3, "result": 9}'

```

*(If an input violates a rule, `xark prove` points directly to the failing line in your Rust source.)*

### Build Circuits, Verifier Crate, & TypeScript Client

Compiles changed circuits to WASM, updates the `no_std` Solana verifier crate, and refreshes the TypeScript client used by the frontend:

```bash
xark build

```

### Run End-to-End Solana Verification Tests (LiteSVM)

```bash
pnpm install
xark test

```

---

## How Solana Verifies a Proof

Inside the Solana program (`programs/`), verifying a proof takes just a few lines of `no_std` Rust using the generated verifier crate:

```rust
let Some(proof_bytes) = instruction_data.first_chunk::<256>() else {
    return Err(ProgramError::InvalidInstructionData);
};

let proof = korazk_verifier::Proof::from_le_bytes(proof_bytes);
let inputs = korazk_verifier::PublicInputs {
    threshold,
    recipient,
    nullifier,
};

if !korazk_verifier::verify(&proof, inputs) {
    return Err(ProgramError::InvalidArgument);
}

```

Under the hood, `verify()` unpacks the 256-byte proof into three elliptic-curve points ($A, B, C$ on BN254) and invokes Solana's native `sol_alt_bn128_group_op` pairing syscall—completing verification in ~77,000 compute units.

---

## Security & Production Checklist

* **Circuit Digest:** Every `xark build` prints a unique circuit digest (fingerprint). Whenever you modify a constraint in `circuits/`, re-run `xark build` so the frontend (`korazk/`) and Solana program use matching keys.
* **Devnet vs. Mainnet Keys:** The keys generated locally by `xark prove` come from a single-party setup suitable for local development and Solana Devnet. Before deploying with real user funds on **Mainnet**, run a multi-party trusted setup via `xark ceremony` so no single party ever holds the setup randomness.

---

## License

MIT
