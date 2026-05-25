import OpenAI from "openai";

// Client initialized for Day 2 — skeleton only on Day 1
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export async function scoreFuzzyMatches(
  pairs: Array<{
    bankDesc: string;
    bankAmount: number;
    bankDate: string;
    ledgerDesc: string;
    ledgerAmount: number;
    ledgerDate: string;
  }>
): Promise<Array<{ confidence: number; reasoning: string }>> {
  // TODO: Implement in Day 2
  // Will send batch to GPT-4o-mini with structured prompt
  // Temperature: 0 for deterministic results
  void openai;
  return pairs.map(() => ({
    confidence: 0,
    reasoning: "Not yet implemented",
  }));
}
