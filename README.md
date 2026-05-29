# Hisab.ai

**AI-powered bank ↔ ledger reconciliation** with confidence scoring, human review workflow, and audit-ready exports.

## Live demo

- **Vercel**: `https://aireconciliationagent.vercel.app/`

## Screenshot

Preview image (OpenGraph):

![Hisab.ai preview](https://aireconciliationagent.vercel.app/opengraph-image)

## Tech stack

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![OpenAI](https://img.shields.io/badge/OpenAI-API-10a37f)

## Quick start

```bash
git clone <YOUR_REPO_URL>
cd ai-reconciliation
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

See `.env.example`:

- **`DATABASE_URL`**: PostgreSQL connection string
- **`OPENAI_API_KEY`**: OpenAI API key (optional for AI features)
- **`AUTH_SECRET`**: session signing secret
- **`NEXT_PUBLIC_APP_URL`**: optional canonical URL for OpenGraph previews

## Architecture (brief)

- **UI (Next.js App Router)**: `app/`
  - `app/upload`: file upload + parsing + match start
  - `app/dashboard`: review workflow, export, posting, journal log
  - `app/history`: list prior sessions (DB-backed when configured)
- **Core matching engine**: `lib/matcher.ts` (rules + confidence + summaries)
- **AI features (optional)**: `app/api/ai/*` + `lib/openai.ts`
- **Database (optional)**: Prisma models + `lib/db.ts` + `lib/db-helpers.ts`

## Evaluation results (rules engine)

These results come from the **dataset test harness** (`npm run test:datasets`) which evaluates the rules-based matcher (no OpenAI calls).

| Dataset | Result | Notes |
|---|---:|---|
| Sample baseline (`data/sample_*.csv`) | 100% | Curated small demo set; may trigger “suspiciously perfect” warning |
| Empty files | ✅ Pass | Graceful error (no crash) |
| Mismatched columns | ✅ Pass | Column mapping/normalization handles header variants |
| Negative amounts | ❌ Known limitation | Signed values can prevent matching; future normalization needed |

Full details: `DOCUMENTATION.md`.

## Documentation

- **Full documentation**: `DOCUMENTATION.md`
- **Case study**: `CASE_STUDY.md`

## License

MIT — see `LICENSE`.
