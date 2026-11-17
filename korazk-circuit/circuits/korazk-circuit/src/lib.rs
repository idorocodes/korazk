use xark::prelude::*;
use xark_poseidon2::prelude::*;

pub const STATEMENT_TREE_DEPTH: usize = 8;

/// Proof modes supported by the unified KoraZK circuit:
/// - 0: Range / Threshold (Income, Balance, Age >= min_threshold)
/// - 1: Selective Bank Transaction Inclusion (Merkle proof of 1 statement row)
/// - 2: Identity & Sybil Uniqueness (Verified NIN + deterministic app nullifier)
pub const MODE_RANGE: u64 = 0;
pub const MODE_TX_INCLUSION: u64 = 1;
pub const MODE_IDENTITY: u64 = 2;

fn compute_merkle_root<const DEPTH: usize>(
    leaf: Field,
    path: [Field; DEPTH],
    indices: [bool; DEPTH],
) -> Field {
    let mut current = leaf;
    for i in 0..DEPTH {
        let sibling = path[i];
        let (left, right) = if indices[i] {
            (sibling, current)
        } else {
            (current, sibling)
        };
        current = hash2(left, right);
    }
    current
}

#[circuit]
pub fn korazk(
    // --- Public Selector ---
    mode: Public<u64>,

    // --- Private Inputs (Stay in User's Browser) ---
    primary_value: Private<u64>,       // mode 0: actual_value | mode 1: tx_amount | mode 2: kyc_flag (1)
    secondary_value: Private<u64>,     // mode 1: tx_timestamp (0 otherwise)
    secret_field: Private<Field>,      // mode 0: 0 | mode 1: tx_reference_hash | mode 2: nin_fingerprint
    salt: Private<Field>,              // blinding / attestation salt
    merkle_path: Private<[Field; STATEMENT_TREE_DEPTH]>,
    merkle_indices: Private<[bool; STATEMENT_TREE_DEPTH]>,

    // --- Public Inputs (Checked on Solana) ---
    min_threshold: Public<u64>,        // mode 0: min income/age | mode 1: min_timestamp | mode 2: 0
    expected_amount: Public<u64>,      // mode 1: expected tx_amount (0 otherwise)
    public_field: Public<Field>,       // mode 1: expected_reference_hash | mode 2: app_scope (0 for mode 0)
    attested_root_or_commit: Public<Field>, // mode 0 & 2: attested commitment | mode 1: statement Merkle root
    nullifier_out: Public<Field>,      // unique anti-replay / Sybil nullifier
) {
    // Ensure mode is valid (0, 1, or 2)
    require_le(mode, MODE_IDENTITY);

    if mode == MODE_RANGE {
        // 1. Threshold check: actual_value >= min_threshold
        require_ge(primary_value, min_threshold);

        // 2. Commitment check: note = commit([actual_value, salt])
        let note = commit([Field::from(primary_value), salt]);
        require_eq(note, attested_root_or_commit);

        // 3. One-time receipt nullifier
        require_eq(nullifier([salt, note]), nullifier_out);
    } else if mode == MODE_TX_INCLUSION {
        // 1. Transaction amount, reference, and date window checks
        require_eq(primary_value, expected_amount);
        require_eq(secret_field, public_field);
        require_ge(secondary_value, min_threshold);

        // 2. Hash single transaction row into Poseidon2 leaf
        let tx_leaf = hash([
            Field::from(primary_value),
            Field::from(secondary_value),
            secret_field,
            salt,
        ]);

        // 3. Verify 8-level Merkle inclusion against signed statement root
        let computed_root = compute_merkle_root(tx_leaf, merkle_path, merkle_indices);
        require_eq(computed_root, attested_root_or_commit);

        // 4. One-time transaction nullifier
        require_eq(nullifier([salt, tx_leaf]), nullifier_out);
    } else {
        // MODE_IDENTITY (mode == 2)
        // 1. Enforce KYC verified flag == 1
        require_eq(primary_value, 1u64);

        // 2. Verify NIN fingerprint + status matches attested commitment
        let kyc_note = commit([secret_field, Field::from(primary_value), salt]);
        require_eq(kyc_note, attested_root_or_commit);

        // 3. Deterministic Sybil nullifier scoped to app_scope
        require_eq(nullifier([secret_field, public_field]), nullifier_out);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use xark_poseidon2::native::{
        commit as native_commit, hash as native_hash, hash2 as native_hash2,
        nullifier as native_nullifier, Fr,
    };

    /// Helper to build a full 8-level Poseidon2 Merkle tree from up to 256 leaves
    /// and extract the sibling path + left/right direction bits for `target_index`.
    fn build_merkle_proof(
        leaves: &[Fr],
        target_index: usize,
    ) -> (Fr, [Fr; STATEMENT_TREE_DEPTH], [bool; STATEMENT_TREE_DEPTH]) {
        let size = 1usize << STATEMENT_TREE_DEPTH;
        assert!(leaves.len() <= size && target_index < size);

        let mut layer = vec![Fr::from(0u64); size];
        layer[..leaves.len()].copy_from_slice(leaves);

        let mut path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let mut indices = [false; STATEMENT_TREE_DEPTH];
        let mut idx = target_index;

        for depth in 0..STATEMENT_TREE_DEPTH {
            let is_right = (idx & 1) == 1;
            let sibling_idx = if is_right { idx - 1 } else { idx + 1 };
            path[depth] = layer[sibling_idx];
            indices[depth] = is_right;

            let mut next_layer = Vec::with_capacity(layer.len() / 2);
            for pair in layer.chunks(2) {
                next_layer.push(native_hash2(pair[0], pair[1]));
            }
            layer = next_layer;
            idx >>= 1;
        }

        (layer[0], path, indices)
    }

    // ------------------------------------------------------------------------
    // GLOBAL & MODE SELECTOR TESTS
    // ------------------------------------------------------------------------

    #[test]
    fn test_rejects_invalid_mode() {
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // Mode 3 does not exist -> must fail `require_le(mode, MODE_IDENTITY)`
        assert!(korazk(
            3,
            100, 0, Fr::from(0u64), Fr::from(1u64), zero_path, zero_idx,
            50, 0, Fr::from(0u64), Fr::from(0u64), Fr::from(0u64),
        ).is_err());
    }

    // ------------------------------------------------------------------------
    // MODE 0: RANGE & THRESHOLD TESTS (Income, Balance, Age)
    // ------------------------------------------------------------------------

    #[test]
    fn test_mode_0_exact_boundary_succeeds() {
        let income = 400_000u64;
        let salt = Fr::from(111222333u64);
        let note = native_commit([Fr::from(income), salt]);
        let nul = native_nullifier([salt, note]);
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // Exact boundary: 400,000 >= 400,000 must pass
        assert!(korazk(
            MODE_RANGE,
            income, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            400_000, 0, Fr::from(0u64), note, nul,
        ).is_ok());
    }

    #[test]
    fn test_mode_0_one_below_threshold_fails() {
        let income = 399_999u64;
        let salt = Fr::from(111222333u64);
        let note = native_commit([Fr::from(income), salt]);
        let nul = native_nullifier([salt, note]);
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // 1 Naira below threshold must fail
        assert!(korazk(
            MODE_RANGE,
            income, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            400_000, 0, Fr::from(0u64), note, nul,
        ).is_err());
    }

    #[test]
    fn test_mode_0_rejects_forged_income_and_replayed_nullifier() {
        let real_income = 200_000u64;
        let salt = Fr::from(999888777u64);
        let note = native_commit([Fr::from(real_income), salt]);
        let nul = native_nullifier([salt, note]);
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // User tries to lie about income (500k) against the 200k commitment -> must fail
        assert!(korazk(
            MODE_RANGE,
            500_000, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            400_000, 0, Fr::from(0u64), note, nul,
        ).is_err());

        // User tries to output a different nullifier to bypass replay protection -> must fail
        let fake_nul = Fr::from(123456u64);
        assert!(korazk(
            MODE_RANGE,
            650_000, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            400_000, 0, Fr::from(0u64),
            native_commit([Fr::from(650_000u64), salt]),
            fake_nul,
        ).is_err());
    }

    #[test]
    fn test_mode_0_age_verification() {
        let user_age = 21u64;
        let salt = Fr::from(424242u64);
        let note = native_commit([Fr::from(user_age), salt]);
        let nul = native_nullifier([salt, note]);
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // Age 21 >= 18 passes
        assert!(korazk(
            MODE_RANGE,
            user_age, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            18, 0, Fr::from(0u64), note, nul,
        ).is_ok());

        // Age 21 >= 25 fails
        assert!(korazk(
            MODE_RANGE,
            user_age, 0, Fr::from(0u64), salt, zero_path, zero_idx,
            25, 0, Fr::from(0u64), note, nul,
        ).is_err());
    }

    // ------------------------------------------------------------------------
    // MODE 1: SELECTIVE BANK STATEMENT TRANSACTION TESTS
    // ------------------------------------------------------------------------

    #[test]
    fn test_mode_1_multi_tx_statement_right_child_inclusion() {
        // Simulate a 4-transaction bank statement; prove tx at index 3 (right-hand branch bits)
        let txs = [
            (25_000u64, 1_790_000_100u64, Fr::from(101u64), Fr::from(11u64)),
            (80_000u64, 1_790_000_200u64, Fr::from(102u64), Fr::from(22u64)),
            (12_500u64, 1_790_000_300u64, Fr::from(103u64), Fr::from(33u64)),
            (150_000u64, 1_790_000_400u64, Fr::from(104u64), Fr::from(44u64)), // target tx
        ];

        let leaves: Vec<Fr> = txs
            .iter()
            .map(|(amt, ts, r, s)| native_hash([Fr::from(*amt), Fr::from(*ts), *r, *s]))
            .collect();

        let target_idx = 3;
        let (root, path, indices) = build_merkle_proof(&leaves, target_idx);
        let (amt, ts, ref_hash, salt) = txs[target_idx];
        let tx_nul = native_nullifier([salt, leaves[target_idx]]);

        // Valid proof for tx #3 (other 3 transactions stay completely private)
        assert!(korazk(
            MODE_TX_INCLUSION,
            amt, ts, ref_hash, salt, path, indices,
            1_790_000_000, amt, ref_hash, root, tx_nul,
        ).is_ok());

        // Wrong reference hash must fail
        assert!(korazk(
            MODE_TX_INCLUSION,
            amt, ts, ref_hash, salt, path, indices,
            1_790_000_000, amt, Fr::from(999u64), root, tx_nul,
        ).is_err());

        // Transaction older than min_timestamp window must fail
        assert!(korazk(
            MODE_TX_INCLUSION,
            amt, ts, ref_hash, salt, path, indices,
            1_795_000_000, amt, ref_hash, root, tx_nul,
        ).is_err());

        // Swapping index bits (claiming tx #3 is at index #2) must fail
        let mut wrong_indices = indices;
        wrong_indices[0] = !wrong_indices[0];
        assert!(korazk(
            MODE_TX_INCLUSION,
            amt, ts, ref_hash, salt, path, wrong_indices,
            1_790_000_000, amt, ref_hash, root, tx_nul,
        ).is_err());
    }

    // ------------------------------------------------------------------------
    // MODE 2: SYBIL-RESISTANT IDENTITY & UNIQUENESS TESTS (NIN / BVN)
    // ------------------------------------------------------------------------

    #[test]
    fn test_mode_2_identity_unverified_and_cross_app_unlinkability() {
        let nin_fp = Fr::from(998877665544u64);
        let salt = Fr::from(334455u64);
        let app_a = Fr::from(1u64);
        let app_b = Fr::from(2u64);
        let zero_path = [Fr::from(0u64); STATEMENT_TREE_DEPTH];
        let zero_idx = [false; STATEMENT_TREE_DEPTH];

        // 1. Unverified KYC (flag = 0) must fail even with valid commitment
        let unverified_note = native_commit([nin_fp, Fr::from(0u64), salt]);
        let nul_a = native_nullifier([nin_fp, app_a]);
        assert!(korazk(
            MODE_IDENTITY,
            0, 0, nin_fp, salt, zero_path, zero_idx,
            0, 0, app_a, unverified_note, nul_a,
        ).is_err());

        // 2. Verified KYC (flag = 1) produces distinct, unlinkable nullifiers per app
        let verified_note = native_commit([nin_fp, Fr::from(1u64), salt]);
        let nul_b = native_nullifier([nin_fp, app_b]);
        assert_ne!(nul_a, nul_b);

        assert!(korazk(
            MODE_IDENTITY,
            1, 0, nin_fp, salt, zero_path, zero_idx,
            0, 0, app_a, verified_note, nul_a,
        ).is_ok());

        assert!(korazk(
            MODE_IDENTITY,
            1, 0, nin_fp, salt, zero_path, zero_idx,
            0, 0, app_b, verified_note, nul_b,
        ).is_ok());

        // 3. Reusing App A's nullifier on App B must fail
        assert!(korazk(
            MODE_IDENTITY,
            1, 0, nin_fp, salt, zero_path, zero_idx,
            0, 0, app_b, verified_note, nul_a,
        ).is_err());
    }
    
}