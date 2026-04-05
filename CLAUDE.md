# AdsButBetter

AI-powered ad operations agent for Meta Ads.

## Commands
- `npm run build` — compile TypeScript to `dist/`
- `npm run dev` — run with ts-node (development)
- `npm start` — run compiled output (production)

## Architecture
Monolith with clean module boundaries. Key directories:
- `src/models/` — TypeScript interfaces (Campaign, Metrics, Rule, Recommendation, DecisionLog)
- `src/services/` — Core business logic (data-ingestion, rule-engine, recommendation, execution, logging)
- `src/db/` — SQLite via better-sqlite3, repository pattern
- `src/discord/` — Discord.js bot + alert system
- `src/scheduler/` — node-cron job definitions
- `rules/` — JSON rule definitions

## Data flow
Scheduler polls metrics → Rule engine evaluates → Recommendations generated → Discord alert → Approve/Deny → Execute → Log

## Key patterns
- `DataProvider` interface in `src/services/data-ingestion/index.ts` — swap mock for real Meta API
- Rule engine is pure (no side effects) — takes metrics + rules, returns triggered rules
- Repository pattern for all DB access
- Rules are JSON files loaded into SQLite at runtime
