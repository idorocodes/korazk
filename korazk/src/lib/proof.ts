/**
 * Brand, demo data and the (simulated) proof helpers.
 * The brand name is controlled by this single constant.
 */
export const BRAND = 'KoraZK';

/** Compute units to verify one proof on Solana. */
export const VERIFY_CU = '77,412';

/** Placeholder destinations — swap for real URLs when they exist. */
export const LINKS = {
  docs: 'https://www.github.com/idorocodes/korazk',
  github: 'https://www.github.com/idorocodes/korazk',
};

export const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic stand-in for a 256-byte Groth16 proof. Demo only — not a real proof. */
export function proofBytes(seed: string): number[] {
  const next = mulberry32(hashString(seed) || 1);
  return Array.from({ length: 256 }, () => Math.floor(next() * 256));
}

export const toHex = (bytes: number[]): string => '0x' + bytes.map((b) => HEX[b]).join('');

export const shortHex = (bytes: number[]): string =>
  `0x${HEX[bytes[0]]}${HEX[bytes[1]]}…${HEX[bytes[254]]}${HEX[bytes[255]]}`;

/* ───────── Hero playground ───────── */

export interface Preset {
  chip: string;
  prompt: string;
}

export const PRESETS: Preset[] = [
  { chip: 'Income > ₦400k/mo', prompt: 'Prove I earn > ₦400,000/month' },
  { chip: 'Paid ₦150k · Nov 14', prompt: 'Prove I paid ₦150,000 on Nov 14 (hide rest of statement)' },
  { chip: 'Valid NIN · over 18', prompt: 'Prove I have a valid NIN and am over 18' },
  { chip: 'Hold > 1,000 USDC', prompt: 'Prove I hold > 1,000 USDC without linking my main wallet' },
];

export interface Scenario {
  id: 'idle' | 'income' | 'payment' | 'identity' | 'holdings' | 'custom';
  /** xark circuit the intent maps to */
  circuit: string;
  /** the only thing that becomes public */
  claim: string;
  /** private inputs: label + how wide the redaction bar is (%) */
  witness: { key: string; width: number }[];
  /** what the receipt explicitly does not contain */
  hidden: { key: string; tag: 'HIDDEN' | 'REDACTED' }[];
}

export const IDLE_SCENARIO: Scenario = {
  id: 'idle',
  circuit: '',
  claim: '',
  witness: [
    { key: 'NIN', width: 62 },
    { key: 'BVN', width: 62 },
    { key: 'Account balance', width: 80 },
    { key: 'Statement · 500 tx', width: 100 },
  ],
  hidden: [],
};

function firstAmount(text: string): string | null {
  const match = text.match(/(?:₦|\$)?\d[\d,]*(?:\.\d+)?\s?(?:k|m|usdc|sol)?\b/i);
  return match ? match[0].trim() : null;
}

/** Tiny keyword matcher standing in for the plain-English intent engine. */
export function matchScenario(text: string): Scenario {
  const t = text.toLowerCase();
  const amount = firstAmount(text);

  if (/\b(nin|bvn|age|adult|identity|passport|id)\b/.test(t) || t.includes('over 18')) {
    return {
      id: 'identity',
      circuit: 'circuit_nin_age',
      claim: 'nin_valid and age >= 18',
      witness: [
        { key: 'NIN', width: 68 },
        { key: 'Date of birth', width: 54 },
        { key: 'Full legal name', width: 86 },
        { key: 'Attestor signature', width: 100 },
      ],
      hidden: [
        { key: 'NIN', tag: 'HIDDEN' },
        { key: 'Date of birth', tag: 'REDACTED' },
      ],
    };
  }
  if (/(usdc|usdt|\bsol\b|wallet|token|crypto|hold)/.test(t)) {
    return {
      id: 'holdings',
      circuit: 'circuit_balance_unlinked',
      claim: `balance > ${amount ?? 'threshold'}`,
      witness: [
        { key: 'Main wallet address', width: 100 },
        { key: 'Exact balance', width: 56 },
        { key: 'Ownership signature', width: 88 },
        { key: 'Nullifier secret', width: 70 },
      ],
      hidden: [
        { key: 'Main wallet address', tag: 'HIDDEN' },
        { key: 'Exact balance', tag: 'REDACTED' },
      ],
    };
  }
  if (/(earn|salary|income|payslip|wage|revenue)/.test(t)) {
    return {
      id: 'income',
      circuit: 'circuit_income_threshold',
      claim: `monthly_income > ${amount ?? 'threshold'}`,
      witness: [
        { key: 'Employer', width: 74 },
        { key: 'Exact salary', width: 56 },
        { key: 'Account number', width: 64 },
        { key: 'Statement · 500 tx', width: 100 },
      ],
      hidden: [
        { key: 'Exact salary', tag: 'HIDDEN' },
        { key: 'Employer & full statement', tag: 'REDACTED' },
      ],
    };
  }
  if (/(paid|pay|sent|send|transfer|trf|rent|receipt)/.test(t)) {
    return {
      id: 'payment',
      circuit: 'circuit_tx_inclusion',
      claim: `tx(${amount ?? 'amount'}) in statement_root`,
      witness: [
        { key: 'Account balance', width: 62 },
        { key: 'Other 499 transactions', width: 100 },
        { key: 'Account number', width: 64 },
        { key: 'Merkle path · depth 20', width: 84 },
      ],
      hidden: [
        { key: 'Account balance', tag: 'HIDDEN' },
        { key: 'Other 499 transactions', tag: 'REDACTED' },
      ],
    };
  }
  return {
    id: 'custom',
    circuit: 'circuit_attested_claim',
    claim: 'claim(witness) == true',
    witness: [
      { key: 'Source records', width: 100 },
      { key: 'Account identifiers', width: 66 },
      { key: 'Exact values', width: 54 },
      { key: 'Attestor signature', width: 84 },
    ],
    hidden: [
      { key: 'Source records', tag: 'HIDDEN' },
      { key: 'Exact values', tag: 'REDACTED' },
    ],
  };
}

/* ───────── Selective statement prover ───────── */

export interface Tx {
  id: number;
  date: string;
  desc: string;
  amount: string;
  type: 'debit' | 'credit';
}

export const TRANSACTIONS: Tx[] = [
  { id: 1, date: '14 Nov 2026', desc: 'TRF TO ACME PROPERTIES', amount: '₦150,000.00', type: 'debit' },
  { id: 2, date: '12 Nov 2026', desc: 'SALARY - TECHFLOW LTD', amount: '₦485,000.00', type: 'credit' },
  { id: 3, date: '10 Nov 2026', desc: 'POS PURCHASE - SHOPRITE', amount: '₦23,450.00', type: 'debit' },
  { id: 4, date: '08 Nov 2026', desc: 'TRF FROM ADEOLA O.', amount: '₦75,000.00', type: 'credit' },
  { id: 5, date: '05 Nov 2026', desc: 'AIRTIME - MTN', amount: '₦5,000.00', type: 'debit' },
];
