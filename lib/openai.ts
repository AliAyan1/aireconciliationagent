import OpenAI from "openai";

const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `You are a financial reconciliation expert working with Pakistani business transactions.

Your job: compare pairs of transactions — one from a bank statement, one from an internal ledger — and determine if they represent the SAME real-world financial event.

Consider:
- Entity name variations: "M AHMED SERVICES" might be "Muhammad Ahmed - Consulting Fee"
- Abbreviations: TRF=Transfer, CHQ=Cheque, WDL=Withdrawal, CR=Credit, DEP=Deposit, NEFT/IBFT=Bank Transfer
- Payment platform names: JAZZCASH/Jazz Cash, EASYPAISA/Easypaisa, HBL/Habib Bank
- Reference numbers that might appear in both descriptions
- Amounts and dates as supporting evidence (provided for context)

For each pair, return:
- confidence: 0-100 (how likely these are the same transaction)
  - 90-100: Almost certainly the same transaction
  - 75-89: Likely the same, but some uncertainty
  - 50-74: Possible match, needs human review
  - 0-49: Unlikely to be the same transaction
- reasoning: One sentence explaining your judgment

IMPORTANT: You MUST respond with ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.`;

export interface FuzzyMatchPair {
  id: string;
  bankDesc: string;
  bankAmount: number;
  bankDate: string;
  ledgerDesc: string;
  ledgerAmount: number;
  ledgerDate: string;
}

export interface FuzzyMatchScore {
  id: string;
  confidence: number;
  reasoning: string;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-PK");
}

function buildUserPrompt(pairs: FuzzyMatchPair[]): string {
  const numbered = pairs
    .map((p, index) => {
      return `${index + 1}. Bank: "${p.bankDesc}" (PKR ${formatAmount(p.bankAmount)}, ${p.bankDate}) vs Ledger: "${p.ledgerDesc}" (PKR ${formatAmount(p.ledgerAmount)}, ${p.ledgerDate}) — id: "${p.id}"`;
    })
    .join("\n");

  return `Compare these transaction pairs:

${numbered}

Return JSON array (use the exact id string for each pair):
[
  { "id": "pair-id-here", "confidence": 87, "reasoning": "Same entity - M AHMED is abbreviated Muhammad Ahmed" }
]`;
}

function stripMarkdownFences(content: string): string {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return text.trim();
}

function isScoreItem(value: unknown): value is FuzzyMatchScore {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.confidence === "number" &&
    typeof obj.reasoning === "string"
  );
}

function parseScoresFromJson(
  content: string,
  pairs: FuzzyMatchPair[]
): FuzzyMatchScore[] {
  const cleaned = stripMarkdownFences(content);
  const parsed: unknown = JSON.parse(cleaned);

  let items: unknown[] = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "results" in parsed &&
    Array.isArray((parsed as { results: unknown[] }).results)
  ) {
    items = (parsed as { results: unknown[] }).results;
  } else {
    throw new Error("OpenAI response is not a JSON array");
  }

  const byId = new Map<string, FuzzyMatchScore>();
  for (const item of items) {
    if (!isScoreItem(item)) continue;
    byId.set(item.id, {
      id: item.id,
      confidence: clampConfidence(item.confidence),
      reasoning: item.reasoning.trim() || "AI match assessment",
    });
  }

  return pairs.map((pair) => {
    const score = byId.get(pair.id);
    if (score) return score;
    return {
      id: pair.id,
      confidence: 50,
      reasoning:
        "AI did not return a score for this pair — manual review recommended",
    };
  });
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function fallbackForPairs(
  pairs: FuzzyMatchPair[],
  reasoning: string
): FuzzyMatchScore[] {
  return pairs.map((pair) => ({
    id: pair.id,
    confidence: 50,
    reasoning,
  }));
}

async function scoreBatch(
  pairs: FuzzyMatchPair[],
  isRetry: boolean
): Promise<FuzzyMatchScore[]> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(pairs) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty content in OpenAI response");
    }

    try {
      return parseScoresFromJson(content, pairs);
    } catch (parseError) {
      if (!isRetry) {
        console.error(
          "OpenAI JSON parse failed, retrying once. Pair ids:",
          pairs.map((p) => p.id),
          parseError
        );
        return scoreBatch(pairs, true);
      }
      console.error(
        "OpenAI JSON parse failed after retry. Pair ids:",
        pairs.map((p) => p.id),
        parseError
      );
      return fallbackForPairs(
        pairs,
        "AI scoring unavailable — manual review recommended"
      );
    }
  } catch (error) {
    console.error(
      "OpenAI API call failed. Pair ids:",
      pairs.map((p) => p.id),
      error
    );
    return fallbackForPairs(
      pairs,
      "AI scoring unavailable — manual review recommended"
    );
  }
}

export async function scoreFuzzyMatches(
  pairs: FuzzyMatchPair[]
): Promise<FuzzyMatchScore[]> {
  if (pairs.length === 0) return [];

  if (!isOpenAIConfigured()) {
    return fallbackForPairs(
      pairs,
      "AI scoring unavailable — manual review recommended"
    );
  }

  const allScores: FuzzyMatchScore[] = [];

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchScores = await scoreBatch(batch, false);
    allScores.push(...batchScores);
  }

  return allScores;
}
