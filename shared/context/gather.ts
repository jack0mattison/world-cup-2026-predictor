import type { Fixture } from "../types.js";
import { braveWebSearch, type SearchSnippet } from "./brave.js";

const MAX_SEARCHES = 5;

export interface MatchContext {
  queries: string[];
  snippets: SearchSnippet[];
  gatheredAt: string;
}

function venueCity(venue?: string): string | null {
  if (!venue) return null;
  const city = venue.split(",")[0]?.trim();
  return city || null;
}

function buildQueries(fixture: Fixture): string[] {
  const home = fixture.homeTeam.name;
  const away = fixture.awayTeam.name;
  const city = venueCity(fixture.venue);

  const queries = [
    `${home} vs ${away} World Cup 2026 lineup team news`,
    `${home} World Cup 2026 injury suspension`,
    `${away} World Cup 2026 injury suspension`,
    `${home} vs ${away} World Cup 2026 preview form`,
  ];

  if (city) {
    queries.push(`${city} weather forecast June 2026 World Cup`);
  } else {
    queries.push(`World Cup 2026 ${home} ${away} match stakes group stage`);
  }

  return queries.slice(0, MAX_SEARCHES);
}

export async function gatherMatchContext(
  fixture: Fixture,
  apiKey: string
): Promise<MatchContext> {
  const queries = buildQueries(fixture);
  const seen = new Set<string>();
  const snippets: SearchSnippet[] = [];

  for (const query of queries) {
    try {
      const results = await braveWebSearch(query, apiKey, 4);
      for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        snippets.push(r);
      }
    } catch (err) {
      console.warn(`Brave search failed for "${query}":`, err);
    }
  }

  return {
    queries,
    snippets: snippets.slice(0, 20),
    gatheredAt: new Date().toISOString(),
  };
}

export function formatContextForLlm(context: MatchContext): string {
  if (context.snippets.length === 0) {
    return "No search results returned.";
  }

  return context.snippets
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.description}${s.age ? `\nAge: ${s.age}` : ""}`
    )
    .join("\n\n");
}
