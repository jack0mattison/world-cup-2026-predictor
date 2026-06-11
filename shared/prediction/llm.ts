import { getOpenRouterModel, hasOpenRouterApiKey } from "../config.js";
import { formatContextForLlm, type MatchContext } from "../context/gather.js";
import type { BaselinePrediction, Fixture } from "../types.js";
import { parseLlmAdjustment } from "./adjust.js";
import type { LlmAdjustment } from "../types.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a football match analyst adjusting a statistical pre-match baseline for FIFA World Cup 2026.

You receive:
1. A deterministic Elo/Poisson baseline (authoritative — never replace it)
2. Recent web search snippets (may be incomplete, contradictory, or stale)

Your job: return a SMALL bounded adjustment as JSON only.

Rules:
- Shift each outcome probability by at most ±10 percentage points vs the baseline
- If context is thin or contradictory, return zero shifts and contextQuality "thin"
- Never invent injuries, lineups, or facts not supported by the snippets
- Weight recent, credible sources; ignore rumours
- Rationale: 2-3 sentences in plain English citing the key factors you used
- sources: list URLs from snippets you actually relied on (max 5)
- For knockout matches, draw shift should be 0 (no draw after 90 mins in prediction)

Respond with JSON only, no markdown:
{
  "probabilityShift": { "home": number, "draw": number, "away": number },
  "scorelineShift": { "home": integer -2..2, "away": integer -2..2 },
  "confidence": "low" | "medium" | "high",
  "rationale": "string",
  "sources": ["url"],
  "contextQuality": "thin" | "moderate" | "rich",
  "note": "optional string"
}`;

function buildUserPrompt(
  fixture: Fixture,
  baseline: BaselinePrediction,
  context: MatchContext
): string {
  const kickoff = new Date(fixture.utcDate).toISOString();
  return `MATCH
${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
Kick-off: ${kickoff}
Stage: ${fixture.stage}${fixture.group ? ` · Group ${fixture.group}` : ""}
Venue: ${fixture.venue ?? "TBD"}
Knockout: ${fixture.knockout ? "yes" : "no"}

BASELINE (do not replace — adjust only)
Probabilities: Home ${baseline.probabilities.home}% · Draw ${baseline.probabilities.draw}% · Away ${baseline.probabilities.away}%
Scoreline: ${baseline.scoreline.home}–${baseline.scoreline.away}
Home Elo: ${baseline.homeElo} · Away Elo: ${baseline.awayElo}

SEARCH CONTEXT
${formatContextForLlm(context)}`;
}

export async function fetchLlmAdjustment(
  fixture: Fixture,
  baseline: BaselinePrediction,
  context: MatchContext
): Promise<LlmAdjustment | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || !hasOpenRouterApiKey()) return null;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://world-cup-2026-predictor.netlify.app",
      "X-Title": "Mattison World Cup Predictor",
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(fixture, baseline, context) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }

  return parseLlmAdjustment(parsed);
}
