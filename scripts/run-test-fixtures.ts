import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runTestSuite } from "../lib/test-runner";

const root = join(process.cwd(), "data", "test");

function read(name: string) {
  return readFileSync(join(root, name), "utf-8");
}

function runPair(name: string, bankFile: string, ledgerFile: string) {
  return runTestSuite(read(bankFile), read(ledgerFile), name);
}

function generateLargeCsvs(): { bank: string; ledger: string } {
  const bankLines = [
    "Date,Description,Debit,Credit,Balance,Reference",
  ];
  const ledgerLines = [
    "Date,Description,Amount,Type,Reference,Invoice_No",
  ];
  for (let i = 1; i <= 500; i++) {
    const day = String((i % 28) + 1).padStart(2, "0");
    bankLines.push(
      `2026-05-${day},BULK TXN ${i},${1000 + i},,${1000000 - i},REF${i}`
    );
    ledgerLines.push(
      `2026-05-${day},Ledger entry ${i},${1000 + i},debit,REF${i},INV-${i}`
    );
  }
  return { bank: bankLines.join("\n"), ledger: ledgerLines.join("\n") };
}

const cases: { id: string; run: () => ReturnType<typeof runTestSuite> }[] = [
  {
    id: "2a-empty",
    run: () => runPair("2a Empty file", "edge-empty-bank.csv", "edge-empty-ledger.csv"),
  },
  {
    id: "2b-mismatched-columns",
    run: () =>
      runPair(
        "2b Mismatched columns",
        "edge-mismatched-columns-bank.csv",
        "edge-mismatched-columns-ledger.csv"
      ),
  },
  {
    id: "2c-huge-amounts",
    run: () =>
      runPair(
        "2c Huge amounts",
        "edge-huge-amounts-bank.csv",
        "edge-huge-amounts-ledger.csv"
      ),
  },
  {
    id: "2d-negative",
    run: () =>
      runPair("2d Negative amounts", "edge-negative-bank.csv", "edge-negative-ledger.csv"),
  },
  {
    id: "2e-duplicates",
    run: () =>
      runPair(
        "2e Duplicate transactions",
        "edge-duplicates-bank.csv",
        "edge-duplicates-ledger.csv"
      ),
  },
  {
    id: "2f-unicode",
    run: () =>
      runPair("2f Unicode descriptions", "edge-unicode-bank.csv", "edge-unicode-ledger.csv"),
  },
  {
    id: "2g-large-file",
    run: () => {
      const { bank, ledger } = generateLargeCsvs();
      return runTestSuite(bank, ledger, "2g Large file (500 rows)");
    },
  },
  {
    id: "2h-one-to-many",
    run: () =>
      runPair(
        "2h One-to-many",
        "edge-one-to-many-bank.csv",
        "edge-one-to-many-ledger.csv"
      ),
  },
  {
    id: "sample-baseline",
    run: () => {
      const bank = readFileSync(
        join(process.cwd(), "data", "sample_bank.csv"),
        "utf-8"
      );
      const ledger = readFileSync(
        join(process.cwd(), "data", "sample_ledger.csv"),
        "utf-8"
      );
      return runTestSuite(bank, ledger, "Sample data (bundled)");
    },
  },
];

const lines: string[] = ["# Automated fixture results\n"];

for (const c of cases) {
  const r = c.run();
  const status =
    r.issues.some((i) => i.type === "error") && r.bankRows === 0
      ? "❌ Fail"
      : r.issues.some((i) => i.type === "error")
        ? "❌ Fail"
        : "✅ Pass";
  lines.push(`## ${c.id}`);
  lines.push(`- **Status:** ${status}`);
  lines.push(`- **Bank / Ledger rows:** ${r.bankRows} / ${r.ledgerRows}`);
  lines.push(`- **Match rate:** ${r.matchRate}%`);
  lines.push(`- **Processing:** ${r.processingTimeMs} ms`);
  lines.push(`- **Issues:** ${r.issues.map((i) => i.message).join("; ") || "none"}`);
  lines.push("");
}

writeFileSync(
  join(process.cwd(), "data", "test", "fixture-results.md"),
  lines.join("\n")
);
console.log(lines.join("\n"));
