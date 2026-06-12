# World Cup 2026 Match Predictor

Probabilistic pre-match predictions for every FIFA World Cup 2026 fixture — locked before kick-off, graded for accuracy.

## Stack

- **Frontend:** Vite + TypeScript (vanilla, mobile-first)
- **Backend:** Netlify Functions + Scheduled Functions
- **Storage:** Netlify Blobs
- **Data:** football-data.org (fixtures/results), ESPN scoreboard (live scores fallback), World Football Elo ratings (baseline)

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
| `STRIPE_SECRET_KEY` | Donations | Stripe Checkout for preset donate buttons (£3 / £5 / £10) |

### Stripe donations

1. Add `STRIPE_SECRET_KEY` in Netlify (use `sk_test_...` while testing).
2. Run `npm run dev:netlify` locally with the same key in `.env` or `.env.local`.
3. Click a donate button in the header → you should land on Stripe Checkout.
4. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. After payment you return to the site with a thank-you banner.
6. Switch to `sk_live_...` in Netlify when ready for real donations.

## Scheduled functions

| Function | Schedule | Purpose |
|---|---|---|
| `predict-background` | Every 30 min | Early Elo (4–12h before KO); final lock (≤4h before KO, with post-KO grace if status lags) |
| `predict` | Manual | Test the prediction pipeline locally |
| `settle` | Every 2h | Refresh fixtures (incl. ESPN), settle results, grade **final** predictions only |

Run `npm run verify:schedule` to assert prediction window logic.

## Deploy

```bash
netlify deploy --prod
```

Link site to Netlify Blobs and set environment variables before the tournament matchdays.

## Architecture

```
Static frontend → /.netlify/functions/api-data → Netlify Blobs
                        ↑
              predict-background (30 min) / settle (2-hourly)
                        ↑
              football-data.org + Elo engine
```

## Milestones

- **M1 (current):** Fixtures, Elo baseline, Blobs, predict/settle, Upcoming + Results + Accuracy views
- **M2 (current):** LLM + Brave Search adjustment layer live; PWA polish remaining
- **M3:** Knockout draw redistribution, bracket view
