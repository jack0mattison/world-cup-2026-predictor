# World Cup 2026 Match Predictor

Probabilistic pre-match predictions for every FIFA World Cup 2026 fixture — locked before kick-off, graded for accuracy.

## Stack

- **Frontend:** Vite + TypeScript (vanilla, mobile-first)
- **Backend:** Netlify Functions + Scheduled Functions
- **Storage:** Netlify Blobs
- **Data:** football-data.org (fixtures/results), World Football Elo ratings (baseline)

## Quick start

```bash
npm install
npm run dev          # Frontend only (uses sample data fallback)
npm run dev:netlify  # Full stack with functions + Blobs (.env.local)
```

## Environment variables

Set in Netlify dashboard (or `.env` for `netlify dev`):

| Variable | Required | Purpose |
|---|---|---|
| `FOOTBALL_DATA_API_KEY` | M1 (prod) | Fixture & result ingestion |
| `OPENROUTER_API_KEY` | M2 | LLM contextual adjustment (via OpenRouter) |
| `OPENROUTER_MODEL` | M2 | Model slug, e.g. `anthropic/claude-sonnet-4` |
| `BRAVE_SEARCH_API_KEY` | M2 | Pre-match context gathering |

## Scheduled functions

| Function | Schedule | Purpose |
|---|---|---|
| `predict` | Hourly | Lock predictions 2–4h before kick-off |
| `settle` | Every 2h | Fetch results, grade predictions, update stats |
| `predict-background` | Manual (M2) | Long-running LLM+search batches |

## Deploy

```bash
netlify deploy --prod
```

Link site to Netlify Blobs and set environment variables before the tournament matchdays.

## Architecture

```
Static frontend → /.netlify/functions/api-data → Netlify Blobs
                        ↑
              predict (hourly) / settle (2-hourly)
                        ↑
              football-data.org + Elo engine
```

## Milestones

- **M1 (current):** Fixtures, Elo baseline, Blobs, predict/settle, Upcoming + Results + Accuracy views
- **M2:** LLM + Brave Search adjustment, PWA polish
- **M3:** Knockout draw redistribution, bracket view
