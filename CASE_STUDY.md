# Hisab.ai — Case Study (Quest 2)

## Problem

Manual reconciliation is slow and error-prone: finance teams spend hours matching bank statements to internal ledgers, with limited auditability and inconsistent results.

## Solution

Hisab.ai provides:

- Upload of bank + ledger files
- Rules-based matching with confidence scoring
- Human review workflow for uncertain matches
- Posting to a journal for audit trail
- Exportable reports

## Key product decisions

- **Human-in-the-loop by default**: auto-matches stay visible; uncertain matches go to review.
- **Auditability**: every decision can be logged and exported.
- **PKR-first UX**: consistent currency formatting and finance-friendly tables.
- **Optional AI layer**: AI scoring and explanations enhance fuzzy matching without being required for core matching.

## Outcomes

- Faster reconciliation cycles
- Clear review queue for exceptions
- Exportable audit trail for compliance

## Links

- Live demo: `https://aireconciliationagent.vercel.app/`
- Documentation: `DOCUMENTATION.md`

