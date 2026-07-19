# TaxGuide — AI Tax Assistant for Small Businesses

A Q&A chat app that helps U.S. small business owners (sole proprietors, freelancers, single/multi-member LLCs) understand and prepare for their federal and state tax filings, powered by Claude.

Built with Next.js 16 (App Router), NextAuth (credentials auth), Prisma + SQLite for persistence, and the Anthropic API for streaming chat.

**This is an educational tool, not a substitute for a licensed CPA or EA.** See [`src/lib/systemPrompt.ts`](src/lib/systemPrompt.ts) for the guardrails baked into the assistant.

## Getting started

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local` (create it if missing) with:

```
AUTH_SECRET="<random-32-byte-base64-string>"
ANTHROPIC_API_KEY="<your Anthropic API key>"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`DATABASE_URL` lives in `.env` and points at a local SQLite file (`prisma/dev.db`). For production, switch the Prisma datasource to Postgres or another hosted database.

## Project structure

- `auth.ts` — NextAuth configuration (credentials provider, JWT sessions)
- `prisma/schema.prisma` — User / Conversation / Message models
- `src/app/api/chat/route.ts` — streaming chat endpoint, calls Claude and persists messages
- `src/app/api/conversations/*` — conversation CRUD
- `src/components/ChatApp.tsx` — chat UI (sidebar + streaming message view)
- `src/lib/systemPrompt.ts` — the TaxGuide system prompt
