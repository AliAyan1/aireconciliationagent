# Automated fixture results

## 2a-empty
- **Status:** ❌ Fail
- **Bank / Ledger rows:** 0 / 0
- **Match rate:** 0%
- **Processing:** 10 ms
- **Issues:** Bank file has headers only — no data rows.; Ledger file has headers only — no data rows.

## 2b-mismatched-columns
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 1 / 1
- **Match rate:** 100%
- **Processing:** 13 ms
- **Issues:** none

## 2c-huge-amounts
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 1 / 1
- **Match rate:** 100%
- **Processing:** 2 ms
- **Issues:** none

## 2d-negative
- **Status:** ❌ Fail
- **Bank / Ledger rows:** 1 / 1
- **Match rate:** 0%
- **Processing:** 1 ms
- **Issues:** 1 bank amount(s) are negative; 1 ledger amount(s) are negative; No matches found at all

## 2e-duplicates
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 3 / 3
- **Match rate:** 66.7%
- **Processing:** 3 ms
- **Issues:** none

## 2f-unicode
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 1 / 1
- **Match rate:** 100%
- **Processing:** 2 ms
- **Issues:** none

## 2g-large-file
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 500 / 500
- **Match rate:** 100%
- **Processing:** 111 ms
- **Issues:** All transactions matched — suspiciously perfect

## 2h-one-to-many
- **Status:** ❌ Fail
- **Bank / Ledger rows:** 1 / 3
- **Match rate:** 0%
- **Processing:** 3 ms
- **Issues:** No matches found at all

## sample-baseline
- **Status:** ✅ Pass
- **Bank / Ledger rows:** 10 / 10
- **Match rate:** 100%
- **Processing:** 5 ms
- **Issues:** All transactions matched — suspiciously perfect
