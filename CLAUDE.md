# HisaabAI

## Project Overview
An AI-powered financial reconciliation tool that automates matching bank statement transactions against internal ledger entries. Built for finance teams who currently spend 4-6 hours monthly doing this manually in Excel.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **AI Engine:** OpenAI API (GPT-4o-mini for fuzzy matching + confidence scoring)
- **Data Processing:** PapaParse (CSV parsing), custom matching logic
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **State Management:** React useState / useReducer (no external state lib needed)

## Architecture
```
User uploads 2 CSVs (bank statement + ledger)
    → PapaParse reads & normalizes both files
    → Matching Engine compares each bank txn against ledger entries
        → Phase 1: Exact matches (amount + date) → auto-matched (confidence 95-100%)
        → Phase 2: Near matches (amount match, date ±2 days) → confidence 85-95%
        → Phase 3: Fuzzy matches → OpenAI API scores description similarity → confidence 60-90%
        → Phase 4: No match found → flagged as unmatched
    → Results displayed in 3 tabs:
        1. Auto-matched (high confidence, no review needed)
        2. Needs Review (human-in-the-loop approve/reject)
        3. Unmatched (investigation needed)
    → Export final reconciliation report as CSV
```

## File Structure
```
ai-reconciliation/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Landing / upload page
│   ├── dashboard/
│   │   └── page.tsx            # Main reconciliation dashboard
│   └── api/
│       ├── match/
│       │   └── route.ts        # POST: Run matching engine on uploaded data
│       ├── ai-score/
│       │   └── route.ts        # POST: OpenAI fuzzy scoring for uncertain pairs
│       └── export/
│           └── route.ts        # POST: Generate reconciliation report CSV
├── components/
│   ├── FileUploader.tsx        # Drag-and-drop CSV upload for bank + ledger
│   ├── MatchTable.tsx          # Table displaying matched transactions
│   ├── ReviewQueue.tsx         # Human-in-the-loop approve/reject interface
│   ├── UnmatchedList.tsx       # List of unmatched transactions
│   ├── StatsCards.tsx          # Summary metrics (total, matched, review, unmatched)
│   ├── ConfidenceBadge.tsx     # Color-coded confidence score badge
│   └── ExportButton.tsx        # Download reconciliation report
├── lib/
│   ├── matcher.ts              # Core matching logic (exact + near + fuzzy)
│   ├── normalizer.ts           # CSV data cleaning & normalization
│   ├── openai.ts               # OpenAI API client wrapper
│   └── types.ts                # TypeScript interfaces for all data models
├── data/
│   ├── sample_bank.csv         # Sample bank statement (50 transactions)
│   └── sample_ledger.csv       # Sample internal ledger (45 transactions)
├── .env.example
├── .env.local                  # (gitignored) actual keys
├── .gitignore
├── .cursorrules
├── CLAUDE.md                   # This file
├── README.md
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

## Key Design Decisions
- **Next.js App Router:** API routes handle server-side matching + OpenAI calls. No separate backend needed.
- **OpenAI for fuzzy matching:** GPT-4o-mini understands that "M AHMED SERVICES" and "Muhammad Ahmed Consulting Fee" are the same entity. We send batch comparisons to minimize API calls.
- **Human-in-the-loop:** AI auto-approves only when confidence > 90%. Everything below goes to human review queue.
- **PapaParse over xlsx:** Lighter, faster for CSV. We only need CSV support for MVP.

## Matching Logic (lib/matcher.ts)
1. **Exact Match:** Same amount AND same date → confidence 98-100%
2. **Near Match:** Same amount, date within ±2 days → confidence 85-95%
3. **Fuzzy Match:** Amount within tolerance (±500), send descriptions to OpenAI for semantic comparison → confidence 60-90%
4. **No Match:** Nothing aligns → flagged as unmatched

## API Routes
- `POST /api/match` — Receives parsed CSV data, runs matching engine, returns categorized results
- `POST /api/ai-score` — Sends uncertain transaction pairs to OpenAI, returns confidence scores
- `POST /api/export` — Generates final CSV report from reviewed matches

## Environment Variables
```
OPENAI_API_KEY=sk-...          # Required for fuzzy matching
```

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # Lint check
```

## Current Sprint
5-day build. MVP only. No auth, no multi-currency, no ERP integration, no database.
Upload CSVs → AI matches → Human reviews → Export report. That's it.
