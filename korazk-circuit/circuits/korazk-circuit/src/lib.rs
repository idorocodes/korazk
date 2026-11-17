use xark::prelude::*;

#[circuit]
pub fn korazk_circuit(secret: Private<Field>, result: Public<Field>) {
    // prove knowledge of a square root: secret * secret == result
    require_eq(secret * secret, result);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid() {
        korazk_circuit(2, 4).unwrap(); // 2 * 2 == 4
    }

    #[test]
    fn rejects_invalid() {
        assert!(korazk_circuit(3, 4).is_err()); // 3 * 3 != 4
    }
}
