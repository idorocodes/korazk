 import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

// Ordered from fastest/highest-capacity to general-purpose stable fallback
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface ExtractedIntent {
  supported: boolean;
  mode: 0 | 1 | 2 | null;
  intent_type:
    | "income_threshold"
    | "balance_threshold"
    | "age_threshold"
    | "tx_inclusion"
    | "identity_uniqueness"
    | "unsupported";
  provider: "mono" | "dojah" | "paystack" | "monnify" | null;
  circuit_inputs: {
    min_threshold: number;
    expected_amount: number;
    reference: string | null;
    min_timestamp: number | null;
    app_scope: string | null;
  };
  human_summary: string;
  rejection_reason: string | null;
}

const intentSchema = {
  type: Type.OBJECT,
  properties: {
    supported: { type: Type.BOOLEAN },
    mode: { type: Type.INTEGER, nullable: true },
    intent_type: {
      type: Type.STRING,
      enum: [
        "income_threshold",
        "balance_threshold",
        "age_threshold",
        "tx_inclusion",
        "identity_uniqueness",
        "unsupported",
      ],
    },
    provider: {
      type: Type.STRING,
      enum: ["mono", "dojah", "paystack", "monnify"],
      nullable: true,
    },
    circuit_inputs: {
      type: Type.OBJECT,
      properties: {
        min_threshold: { type: Type.INTEGER },
        expected_amount: { type: Type.INTEGER },
        reference: { type: Type.STRING, nullable: true },
        min_timestamp: { type: Type.INTEGER, nullable: true },
        app_scope: { type: Type.STRING, nullable: true },
      },
      required: ["min_threshold", "expected_amount"],
    },
    human_summary: { type: Type.STRING },
    rejection_reason: { type: Type.STRING, nullable: true },
  },
  required: ["supported", "intent_type", "circuit_inputs", "human_summary"],
};

function parseNairaAmount(raw: string): number | null {
  const match = raw
    .toLowerCase()
    .replace(/,/g, "")
    .match(/(?:₦|ngn|naira)?\s*(\d+(?:\.\d+)?)\s*(k|m|million)?/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === "k") return Math.round(num * 1_000);
  if (unit === "m" || unit === "million") return Math.round(num * 1_000_000);
  return Math.round(num);
}

/**
 * Layer 1: Instant local fast-path (<1ms, works offline / during API spikes)
 */
function tryLocalRegexExtract(prompt: string): ExtractedIntent | null {
  const lower = prompt.toLowerCase();

  // Mode 2: NIN / BVN / Sybil check
  if (/\b(nin|bvn|kyc|identity|airdrop|claimed before)\b/.test(lower)) {
    return {
      supported: true,
      mode: 2,
      intent_type: "identity_uniqueness",
      provider: "dojah",
      circuit_inputs: {
        min_threshold: 0,
        expected_amount: 0,
        reference: null,
        min_timestamp: null,
        app_scope: "korazk-default-scope",
      },
      human_summary: "Verify valid Nigerian identity via Dojah without exposing raw NIN/BVN.",
      rejection_reason: null,
    };
  }

  // Mode 1: Specific payment / invoice inclusion
  if (/\b(paid|sent|transfer|invoice|inv-|receipt|transaction)\b/.test(lower)) {
    const amount = parseNairaAmount(prompt);
    const refMatch = prompt.match(/\b(INV[-_#]?\w+|REF[-_#]?\w+)\b/i);
    if (amount && amount > 0) {
      return {
        supported: true,
        mode: 1,
        intent_type: "tx_inclusion",
        provider: lower.includes("paystack") ? "paystack" : "mono",
        circuit_inputs: {
          min_threshold: 0,
          expected_amount: amount,
          reference: refMatch ? refMatch[1].toUpperCase() : null,
          min_timestamp: 0,
          app_scope: null,
        },
        human_summary: `Prove single payment of ₦${amount.toLocaleString()} without exposing full statement.`,
        rejection_reason: null,
      };
    }
  }

  // Mode 0: Balance threshold
  if (/\b(balance|proof of funds|in my account|hold at least)\b/.test(lower)) {
    const amount = parseNairaAmount(prompt);
    if (amount && amount > 0) {
      return {
        supported: true,
        mode: 0,
        intent_type: "balance_threshold",
        provider: "mono",
        circuit_inputs: {
          min_threshold: amount,
          expected_amount: 0,
          reference: null,
          min_timestamp: null,
          app_scope: null,
        },
        human_summary: `Verify account balance is at least ₦${amount.toLocaleString()} via Mono without revealing exact balance.`,
        rejection_reason: null,
      };
    }
  }

  // Mode 0: Income / Salary threshold
  if (/\b(earn|income|salary|inflow|make)\b/.test(lower)) {
    const amount = parseNairaAmount(prompt);
    if (amount && amount > 0) {
      return {
        supported: true,
        mode: 0,
        intent_type: "income_threshold",
        provider: "mono",
        circuit_inputs: {
          min_threshold: amount,
          expected_amount: 0,
          reference: null,
          min_timestamp: null,
          app_scope: null,
        },
        human_summary: `Verify monthly inflow is at least ₦${amount.toLocaleString()} via Mono without revealing exact salary.`,
        rejection_reason: null,
      };
    }
  }

  // Mode 0: Age threshold
  const ageMatch = lower.match(/\b(?:age|old|at least|over)\s*(\d{2})\+?\b|\b(\d{2})\+\b/);
  if (ageMatch && /\b(age|old|adult|18\+|21\+|dob|birth)\b/.test(lower)) {
    const age = parseInt(ageMatch[1] || ageMatch[2], 10);
    return {
      supported: true,
      mode: 0,
      intent_type: "age_threshold",
      provider: "dojah",
      circuit_inputs: {
        min_threshold: age,
        expected_amount: 0,
        reference: null,
        min_timestamp: null,
        app_scope: null,
      },
      human_summary: `Verify age is at least ${age} via Dojah without revealing date of birth.`,
      rejection_reason: null,
    };
  }

  return null;
}

/**
 * Layer 2: Gemini structured extraction with automatic model fallback on 503/429
 */
export async function parseIntent(prompt: string): Promise<ExtractedIntent> {
  const local = tryLocalRegexExtract(prompt);
  if (local) return local;

  let lastError: unknown;
  const ai = getGeminiClient();
  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "Extract Nigerian financial/identity ZK proof intents into the unified 3-mode korazk circuit schema (mode 0: income/balance/age threshold, mode 1: single bank tx inclusion, mode 2: NIN/BVN Sybil uniqueness). Convert 400k -> 400000, 1.5m -> 1500000.",
          responseMimeType: "application/json",
          responseSchema: intentSchema,
          temperature: 0,
        },
      });
      return JSON.parse(response.text!) as ExtractedIntent;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      if (status === 503 || status === 429) continue;
      throw err;
    }
  }

  throw lastError;
}

// Quick CLI smoke test
if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = process.argv[2] || "Prove I earn at least ₦400k/month without showing my salary";
  parseIntent(sample).then((res) => console.log(JSON.stringify(res, null, 2)));
}