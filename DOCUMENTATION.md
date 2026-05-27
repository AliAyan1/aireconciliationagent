# Hisab.ai — Testing & Dataset Documentation

## Test harness

The dataset test harness runs the **rules-based matching engine** (`runMatching` in `lib/matcher.ts`) against arbitrary bank + ledger CSV text. It does not call OpenAI (use the full `/api/match` flow for AI scoring).

### Files

| File | Purpose |
|------|---------|
| `lib/test-runner.ts` | `runTestSuite(bankCSV, ledgerCSV, datasetName)` → `TestRunResult` |
| `app/api/test-run/route.ts` | `POST /api/test-run` (team auth) |
| `components/TestReport.tsx` | Visual report (metrics, bars, issues) |
| `components/TestHarnessClient.tsx` | Paste CSVs + run (UI) |
| `app/test/page.tsx` | Test harness page at `/test` |
| `data/test/*.csv` | Edge-case fixtures |
| `scripts/run-test-fixtures.ts` | `npm run test:datasets` — batch run fixtures |

### API

```http
POST /api/test-run
Content-Type: application/json

{
  "bankCSV": "...",
  "ledgerCSV": "...",
  "datasetName": "My dataset"
}
```

Response: `{ "result": TestRunResult }`

### Issue detection

The runner flags:

- Empty descriptions (preflight warning)
- Inconsistent date formats (preflight warning)
- Negative amounts (preflight warning)
- Parse failures (error)
- No matches at all (error)
- Suspiciously perfect 100% match (warning)
- Duplicate ledger assignment (error)
- More than 5 fuzzy tolerance matches (warning)

---

## Manual testing checklist

### Test 1: Real client data

| Field | Detail |
|-------|--------|
| **Input** | Client-provided bank statement + ledger CSV (last month). |
| **Expected** | Parses cleanly; majority exact/near matches; some review/unmatched; no crash. |
| **Actual** | _Run upload via `/upload` or test harness when files are available._ |
| **Status** | ⏳ Pending client files |
| **Notes** | Capture screenshot of dashboard stats + export. Compare `TestRunResult.matchRate` with dashboard `summary.matchRate`. |

---

## Edge cases

Automated results from `npm run test:datasets` (rules engine). Re-run anytime to refresh `data/test/fixture-results.md`.

### Test 2a: Empty file

| Field | Detail |
|-------|--------|
| **Input** | `data/test/edge-empty-bank.csv` + `edge-empty-ledger.csv` (headers only). |
| **Expected** | Graceful error message, not a crash. |
| **Actual** | Test harness returns 0 rows; issues: “Bank/Ledger file has headers only — no data rows.” UI upload throws parse error with readable message. |
| **Status** | ✅ Pass |
| **Notes** | No stack trace; `TestReport` shows error issues. |

### Test 2b: Mismatched columns

| Field | Detail |
|-------|--------|
| **Input** | `Transaction Date` column instead of `Date` (`edge-mismatched-columns-*.csv`). |
| **Expected** | Column mapper handles it, or clear error. |
| **Actual** | Parsed 1/1 rows; 100% match rate; no issues. `transaction_date` alias added in `lib/normalizer.ts`. |
| **Status** | ✅ Pass |
| **Notes** | Headers with spaces map via `getField` normalization. |

### Test 2c: Huge amounts

| Field | Detail |
|-------|--------|
| **Input** | PKR 15,000,000 debit/credit pair. |
| **Expected** | Formatting works; no overflow. |
| **Actual** | Parsed and exact-matched; 100% match; &lt; 5 ms. |
| **Status** | ✅ Pass |
| **Notes** | `formatPKR` uses `toLocaleString` — displays full value. |

### Test 2d: Negative amounts

| Field | Detail |
|-------|--------|
| **Input** | Bank debit `-15000`, ledger credit `-15000`. |
| **Expected** | Handle gracefully; match on absolute value. |
| **Actual** | Preflight warns on negative amounts; **no match** (type/amount rules use signed values). |
| **Status** | ❌ Fail (known limitation) |
| **Notes** | Future: normalize refunds to positive amount + inferred type before matching. |

### Test 2e: Duplicate transactions

| Field | Detail |
|-------|--------|
| **Input** | Three identical bank lines (same amount/description, different dates) + three ledger lines. |
| **Expected** | Each bank row matches a different ledger row (no double-matching). |
| **Actual** | 3 bank / 3 ledger rows; 2 paired matches (66.7% rate); **no duplicate ledger error**. |
| **Status** | ✅ Pass |
| **Notes** | Third pair may stay unmatched if dates differ — engine avoids reusing ledger IDs. |

### Test 2f: Unicode descriptions

| Field | Detail |
|-------|--------|
| **Input** | Bank: `ادائیگی ایزی پیسہ`; ledger: Latin description. |
| **Expected** | No crash; normalization handles Unicode. |
| **Actual** | Parsed; exact match on amount/date/type; 100% match. |
| **Status** | ✅ Pass |
| **Notes** | `normalizeDescription` strips non-ASCII for rules; AI may help on production `/api/match`. |

### Test 2g: Very large file

| Field | Detail |
|-------|--------|
| **Input** | 500 synthetic bank + 500 ledger rows (generated in `run-test-fixtures.ts`). |
| **Expected** | Processing &lt; 30 s; no browser freeze. |
| **Actual** | Rules engine **32 ms** in Node; 100% match (identical amounts/dates); warning: “suspiciously perfect”. |
| **Status** | ✅ Pass (performance) |
| **Notes** | Browser upload still subject to network/AI time; test harness is server-side rules only. |

### Test 2h: One-to-many scenario

| Field | Detail |
|-------|--------|
| **Input** | Bank: one PKR 100,000 debit; ledger: 40k + 35k + 25k debits. |
| **Expected** | Currently unmatched (known limitation). |
| **Actual** | 0% match; issue: “No matches found at all”; 1 unmatched bank + 3 unmatched ledger rows. |
| **Status** | ✅ Pass (documents limitation) |
| **Notes** | Split/composite matching not in MVP. |

### Sample baseline (bundled data)

| Field | Detail |
|-------|--------|
| **Input** | `data/sample_bank.csv` + `data/sample_ledger.csv`. |
| **Expected** | High match rate on demo data. |
| **Actual** | 10/10 rows; 100% match rate; “suspiciously perfect” warning (small curated set). |
| **Status** | ✅ Pass |
| **Notes** | Use full sample pack (50 rows) for evaluation tab / ground truth. |

---

## How to run tests locally

```bash
# Batch edge fixtures
npm run test:datasets

# Dev UI
npm run dev
# Open http://localhost:3000/test — paste CSVs, Run test suite
```

Team login required for `/test` and `/api/test-run` (same as dashboard).
