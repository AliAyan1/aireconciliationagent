# HisaabAI

Smart bank & ledger matching with AI confidence scores and audit-ready exports.

## Getting started

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL, OPENAI_API_KEY, AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in:

- **Team:** `team@hisaabai.local` / `team12345` — upload, match, review, export
- **Admin:** `admin@hisaabai.local` / `admin12345` — analytics & reports
