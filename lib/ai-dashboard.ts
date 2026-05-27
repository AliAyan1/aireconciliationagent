import type { MatchResult } from "./types";
import { getOpenAIClient, isOpenAIConfigured, stripMarkdownFences } from "./openai";

const MODEL = "gpt-4o-mini";

export interface AnomalyFlag {
  matchId: string;
  reason: string;
}

export interface NLQueryResult {
  message: string;
  tab?: "auto" | "review" | "unmatched";
  matchIds: string[] | null;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-PK");
}

function compactResult(r: MatchResult) {
  return {
    id: r.id,
    status: r.status,
    matchType: r.matchType,
    confidence: r.confidence,
    bank: r.bankTransaction
      ? {
          desc: r.bankTransaction.description.slice(0, 100),
          amount: r.bankTransaction.amount,
          date: r.bankTransaction.date,
        }
      : null,
    ledger: r.ledgerEntry
      ? {
          desc: r.ledgerEntry.description.slice(0, 100),
          amount: r.ledgerEntry.amount,
          date: r.ledgerEntry.date,
        }
      : null,
  };
}

async function chatJson(system: string, user: string, maxTokens = 800): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty OpenAI response");
  return stripMarkdownFences(content);
}

export async function explainMatch(match: MatchResult): Promise<string> {
  if (!isOpenAIConfigured()) {
    return "Add OPENAI_API_KEY to enable AI explanations.";
  }
  const bank = match.bankTransaction;
  const ledger = match.ledgerEntry;
  if (!bank || !ledger) {
    return "Both bank and ledger sides are required to explain a match.";
  }

  const system = `You are a financial reconciliation expert for Pakistani businesses.
Explain in ONE clear sentence why the bank and ledger transactions likely represent the same real-world payment.
Mention entity names, amounts (PKR), dates, or references when relevant. No markdown.`;

  const user = `Bank: "${bank.description}" — PKR ${formatAmount(bank.amount)} on ${bank.date}
Ledger: "${ledger.description}" — PKR ${formatAmount(ledger.amount)} on ${ledger.date}
Match type: ${match.matchType}, confidence ${match.confidence}%`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return (
      response.choices[0]?.message?.content?.trim() ||
      "These transactions appear to describe the same payment."
    );
  } catch {
    return "Could not generate an explanation right now.";
  }
}

export async function detectAnomalies(
  results: MatchResult[]
): Promise<AnomalyFlag[]> {
  if (!isOpenAIConfigured() || results.length === 0) return [];

  const sample = results.slice(0, 60).map(compactResult);
  const system = `You are a senior auditor reviewing bank vs ledger reconciliation.
Flag suspicious items: unusually large amounts, potential duplicate payments, miscategorized pairs, amounts that don't make business sense, or odd unmatched items.
Return ONLY a JSON array (no markdown). Each item: { "matchId": "exact id from input", "reason": "short phrase under 15 words" }.
Return [] if nothing suspicious. Max 12 flags.`;

  const user = `Transactions (${results.length} total, showing up to 60):
${JSON.stringify(sample, null, 0)}`;

  try {
    const raw = await chatJson(system, user, 1200);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(results.map((r) => r.id));
    return parsed
      .filter(
        (item): item is AnomalyFlag =>
          !!item &&
          typeof item === "object" &&
          typeof (item as AnomalyFlag).matchId === "string" &&
          typeof (item as AnomalyFlag).reason === "string" &&
          validIds.has((item as AnomalyFlag).matchId)
      )
      .slice(0, 12);
  } catch (error) {
    console.error("Anomaly detection failed:", error);
    return [];
  }
}

type NLPlan = {
  intent: "filter" | "aggregate";
  tab?: "auto" | "review" | "unmatched" | null;
  filters?: {
    statuses?: string[];
    minAmount?: number | null;
    maxAmount?: number | null;
    minConfidence?: number | null;
    maxConfidence?: number | null;
    matchTypes?: string[];
  };
  aggregate?: string | null;
  reply?: string;
};

function rowAmount(r: MatchResult): number {
  return r.bankTransaction?.amount ?? r.ledgerEntry?.amount ?? 0;
}

function applyFilters(results: MatchResult[], plan: NLPlan): MatchResult[] {
  const f = plan.filters ?? {};
  return results.filter((r) => {
    if (f.statuses?.length && !f.statuses.includes(r.status)) return false;
    if (f.matchTypes?.length && !f.matchTypes.includes(r.matchType)) return false;
    const amt = rowAmount(r);
    if (f.minAmount != null && amt < f.minAmount) return false;
    if (f.maxAmount != null && amt > f.maxAmount) return false;
    if (f.minConfidence != null && r.confidence < f.minConfidence) return false;
    if (f.maxConfidence != null && r.confidence > f.maxConfidence) return false;
    return true;
  });
}

function runAggregate(results: MatchResult[], metric: string): string {
  const m = metric.toLowerCase();
  if (m.includes("posted")) {
    const posted = results.filter((r) => r.status === "posted");
    const sum = posted.reduce((s, r) => s + rowAmount(r), 0);
    return `Total amount of posted entries: PKR ${formatAmount(sum)} (${posted.length} items).`;
  }
  if (m.includes("unmatched")) {
    const unmatched = results.filter((r) => r.status === "unmatched");
    const sum = unmatched.reduce((s, r) => s + rowAmount(r), 0);
    return `Unmatched transactions: ${unmatched.length} items, total PKR ${formatAmount(sum)}.`;
  }
  if (m.includes("confidence") || m.includes("lowest")) {
    const paired = results.filter((r) => r.bankTransaction && r.ledgerEntry);
    if (paired.length === 0) return "No matched pairs to rank by confidence.";
    const min = paired.reduce((a, b) => (a.confidence <= b.confidence ? a : b));
    return `Lowest confidence match is ${min.confidence}% (${min.bankTransaction?.description?.slice(0, 40) ?? "—"}).`;
  }
  if (m.includes("matched") || m.includes("auto")) {
    const matched = results.filter(
      (r) =>
        r.status === "auto_matched" ||
        r.status === "posted" ||
        r.status === "approved"
    );
    return `${matched.length} matched transaction(s) in this session.`;
  }
  if (m.includes("phase") || m.includes("exact") || m.includes("fuzzy") || m.includes("ai")) {
    const counts = { exact: 0, near: 0, fuzzy: 0, ai: 0 };
    for (const r of results) {
      if (r.matchType === "exact") counts.exact++;
      else if (r.matchType === "near") counts.near++;
      else if (r.matchType === "fuzzy") counts.fuzzy++;
      else if (r.matchType === "ai_scored") counts.ai++;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return `Matches by phase — Exact: ${counts.exact}, Near: ${counts.near}, Fuzzy: ${counts.fuzzy}, AI: ${counts.ai}. Most matches came from ${top[0]} (${top[1]}).`;
  }
  const sum = results.reduce((s, r) => s + rowAmount(r), 0);
  return `Session total across ${results.length} rows: PKR ${formatAmount(sum)}.`;
}

export async function generateSessionSummary(
  results: MatchResult[],
  summary: {
    matchRate: number;
    autoMatched: number;
    needsReview: number;
    unmatched: number;
    totalBankTxns: number;
  }
): Promise<string> {
  if (!isOpenAIConfigured()) {
    return `Your reconciliation is ${summary.matchRate}% complete with ${summary.autoMatched} auto-matched, ${summary.needsReview} in review, and ${summary.unmatched} unmatched.`;
  }

  const topReview = results
    .filter((r) => r.status === "review")
    .slice(0, 3)
    .map(compactResult);
  const topUnmatched = results
    .filter((r) => r.status === "unmatched")
    .slice(0, 3)
    .map(compactResult);
  const unmatchedSum = results
    .filter((r) => r.status === "unmatched")
    .reduce((s, r) => s + rowAmount(r), 0);

  const system = `Write a 2-3 sentence plain-English reconciliation summary for a finance user in Pakistan (PKR).
Mention match rate, auto-matched count, review items with amounts if known, and unmatched total PKR ${formatAmount(unmatchedSum)}.
No markdown. Be specific when sample data is provided.`;

  const user = `Metrics: ${JSON.stringify(summary)}
Review samples: ${JSON.stringify(topReview)}
Unmatched samples: ${JSON.stringify(topUnmatched)}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return (
      response.choices[0]?.message?.content?.trim() ||
      `Reconciliation is ${summary.matchRate}% complete.`
    );
  } catch {
    return `Your reconciliation is ${summary.matchRate}% complete. ${summary.autoMatched} transactions matched automatically, ${summary.needsReview} need review, and ${summary.unmatched} remain unmatched.`;
  }
}

export async function generateExecutiveSummary(
  results: MatchResult[],
  summary: {
    matchRate: number;
    autoMatched: number;
    needsReview: number;
    unmatched: number;
    difference: number;
  }
): Promise<string> {
  if (!isOpenAIConfigured()) {
    return "Configure OPENAI_API_KEY to generate an executive summary.";
  }

  const system = `Write a 3-paragraph executive summary for management about a bank vs ledger reconciliation.
Paragraph 1: overall status and match rate. Paragraph 2: key issues and amounts in PKR. Paragraph 3: recommended actions.
Professional tone. No markdown headers.`;

  const user = `Summary metrics: ${JSON.stringify(summary)}
Total rows: ${results.length}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || "Summary unavailable.";
  } catch {
    return "Could not generate executive summary.";
  }
}

export async function suggestUnmatchedHints(
  results: MatchResult[]
): Promise<{ matchId: string; hint: string }[]> {
  const unmatched = results.filter((r) => r.status === "unmatched").slice(0, 15);
  if (!unmatched.length) return [];
  if (!isOpenAIConfigured()) {
    return unmatched.map((r) => ({
      matchId: r.id,
      hint: "No ledger entry found — check petty cash, timing, or alternate description.",
    }));
  }

  const system = `For each unmatched bank/ledger transaction, suggest ONE sentence why it might be unmatched and what to check.
Common reasons: missing ledger entry, timing difference, petty cash, personal withdrawal, recorded under different name.
Return JSON array: [{ "matchId": "id", "hint": "sentence" }]. Urdu/English descriptions possible.`;

  const user = JSON.stringify(unmatched.map(compactResult));

  try {
    const raw = await chatJson(system, user, 900);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(unmatched.map((r) => r.id));
    return parsed
      .filter(
        (x): x is { matchId: string; hint: string } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { matchId: string }).matchId === "string" &&
          typeof (x as { hint: string }).hint === "string" &&
          valid.has((x as { matchId: string }).matchId)
      )
      .slice(0, 15);
  } catch {
    return [];
  }
}

export async function reviewChat(
  match: MatchResult,
  question: string
): Promise<string> {
  if (!isOpenAIConfigured()) {
    return "Add OPENAI_API_KEY to enable conversational review.";
  }
  const bank = match.bankTransaction;
  const ledger = match.ledgerEntry;

  const system = `You help a reviewer decide on a bank vs ledger match. Answer briefly in 1-3 sentences.
User may ask about duplicates, risk, dates, amounts, or entity names. Pakistani business context.`;

  const user = `Match: ${JSON.stringify(compactResult(match))}
Reviewer question: ${question}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || "No analysis available.";
  } catch {
    return "Could not reach AI right now.";
  }
}

export async function predictMatchRate(
  bankSample: { description: string; amount: number; date: string }[],
  ledgerSample: { description: string; amount: number; date: string }[]
): Promise<string> {
  if (!isOpenAIConfigured() || !bankSample.length || !ledgerSample.length) {
    return "85–92%";
  }

  const system = `Estimate reconciliation match rate range (e.g. "85-92%") from small CSV samples.
Consider description similarity, amount alignment, date proximity. Return ONLY JSON: { "range": "85-92%", "note": "one short sentence" }`;

  const user = `Bank sample:\n${JSON.stringify(bankSample)}\nLedger sample:\n${JSON.stringify(ledgerSample)}`;

  try {
    const raw = await chatJson(system, user, 120);
    const parsed = JSON.parse(raw) as { range?: string; note?: string };
    return parsed.range
      ? `${parsed.range}${parsed.note ? ` — ${parsed.note}` : ""}`
      : "85–92%";
  } catch {
    return "85–92%";
  }
}

export async function mapColumnsWithAI(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<Record<string, string>> {
  if (!isOpenAIConfigured()) return {};

  const system = `Identify CSV columns for bank/ledger reconciliation.
Return ONLY JSON mapping keys to header names: date, description, amount, debit, credit, balance, reference.
Use exact header strings from input.`;

  const user = `Headers: ${JSON.stringify(headers)}\nSample rows:\n${JSON.stringify(sampleRows.slice(0, 5))}`;

  try {
    const raw = await chatJson(system, user, 200);
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function findDuplicatesWithAI(
  bank: { row: number; description: string; amount: number; date: string }[],
  ledger: { row: number; description: string; amount: number; date: string }[]
): Promise<
  { source: string; rowA: number; rowB: number; reason: string; confidence: number }[]
> {
  if (!isOpenAIConfigured()) return [];

  const system = `Find likely duplicate rows within each file (not matches between files).
Return JSON array max 8: { "source": "bank"|"ledger", "rowA": number, "rowB": number, "reason": "short", "confidence": 0-100 }`;

  const user = `Bank:\n${JSON.stringify(bank.slice(0, 25))}\nLedger:\n${JSON.stringify(ledger.slice(0, 25))}`;

  try {
    const raw = await chatJson(system, user, 600);
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as never[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function runNaturalLanguageQuery(
  question: string,
  results: MatchResult[]
): Promise<NLQueryResult> {
  if (!isOpenAIConfigured()) {
    return {
      message: "Add OPENAI_API_KEY to .env.local to use natural language queries.",
      matchIds: null,
    };
  }

  const summary = {
    total: results.length,
    autoMatched: results.filter(
      (r) => r.status === "auto_matched" || r.status === "posted"
    ).length,
    review: results.filter((r) => r.status === "review").length,
    unmatched: results.filter((r) => r.status === "unmatched").length,
  };

  const system = `You translate natural language questions about a reconciliation dashboard into a JSON plan.
Statuses: auto_matched, review, approved, rejected, unmatched, posted.
Match types: exact, near, fuzzy, ai_scored, unmatched, generated.
Return ONLY JSON:
{
  "intent": "filter" | "aggregate",
  "tab": "auto" | "review" | "unmatched" | null,
  "filters": { "statuses": [], "minAmount": number|null, "maxAmount": number|null, "minConfidence": number|null, "maxConfidence": number|null, "matchTypes": [] },
  "aggregate": "sum_posted_amount" | "sum_unmatched" | "count_matched" | "lowest_confidence" | null,
  "reply": "short friendly sentence preview"
}
For "show/filter/list" questions use intent filter. For totals/counts/averages use intent aggregate.
PKR amounts are plain numbers (50000 = fifty thousand PKR).`;

  const user = `Session summary: ${JSON.stringify(summary)}
Question: ${question}`;

  try {
    const raw = await chatJson(system, user, 400);
    const plan = JSON.parse(raw) as NLPlan;

    if (plan.intent === "aggregate" && plan.aggregate) {
      return {
        message: plan.reply || runAggregate(results, plan.aggregate),
        matchIds: null,
        tab: plan.tab ?? undefined,
      };
    }

    const filtered = applyFilters(results, plan);
    let message =
      plan.reply ||
      `Showing ${filtered.length} transaction(s) matching your question.`;
    if (filtered.length === 0) {
      message = plan.reply || "No transactions match that question.";
    }

    return {
      message,
      tab: plan.tab ?? undefined,
      matchIds: filtered.map((r) => r.id),
    };
  } catch (error) {
    console.error("NL query failed:", error);
    return {
      message: "Could not interpret that question. Try rephrasing.",
      matchIds: null,
    };
  }
}
