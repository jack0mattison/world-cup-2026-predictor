import type { Fixture, MatchStage, MatchStatus, Team } from "../types.js";
import type { FixturesProvider } from "./provider.js";

const BASE_URL = "https://api.football-data.org/v4";

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE: "GROUP_STAGE",
  LAST_32: "LAST_32",
  LAST_16: "LAST_16",
  QUARTER_FINALS: "QUARTER_FINALS",
  SEMI_FINALS: "SEMI_FINALS",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
  ROUND_OF_32: "LAST_32",
  ROUND_OF_16: "LAST_16",
};

const KNOCKOUT_STAGES = new Set<MatchStage>([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  matchday?: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  venue?: string | null;
  score?: {
    fullTime: { home: number | null; away: number | null };
    winner?: string | null;
  };
}

function mapTeam(t: FootballDataTeam): Team {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? t.name,
    tla: t.tla ?? t.name.slice(0, 3).toUpperCase(),
    crest: t.crest,
  };
}

function mapMatch(m: FootballDataMatch): Fixture {
  const stage = STAGE_MAP[m.stage] ?? "GROUP_STAGE";
  const home = m.score?.fullTime.home;
  const away = m.score?.fullTime.away;
  let winner: "HOME" | "AWAY" | "DRAW" | undefined;

  if (home !== null && home !== undefined && away !== null && away !== undefined) {
    if (home > away) winner = "HOME";
    else if (away > home) winner = "AWAY";
    else winner = "DRAW";
  }

  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status as MatchStatus,
    stage,
    group: m.group ?? undefined,
    homeTeam: mapTeam(m.homeTeam),
    awayTeam: mapTeam(m.awayTeam),
    venue: m.venue ?? undefined,
    matchday: m.matchday ?? undefined,
    knockout: KNOCKOUT_STAGES.has(stage),
    score:
      home !== null && home !== undefined
        ? { home, away: away ?? 0, winner }
        : undefined,
  };
}

export class FootballDataProvider implements FixturesProvider {
  readonly name = "football-data.org";

  constructor(private apiKey: string) {}

  private async fetch(path: string): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-Auth-Token": this.apiKey },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`football-data.org ${res.status}: ${body}`);
    }
    return res.json();
  }

  async fetchFixtures(): Promise<Fixture[]> {
    const data = (await this.fetch("/competitions/WC/matches?season=2026")) as {
      matches?: FootballDataMatch[];
    };
    const matches = data.matches ?? [];
    if (matches.length === 0) {
      throw new Error("football-data.org returned no WC 2026 matches");
    }
    return matches.map(mapMatch).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }

  async fetchResults(matchIds: number[]): Promise<Fixture[]> {
    if (matchIds.length === 0) return [];
    const all = await this.fetchFixtures();
    const idSet = new Set(matchIds);
    return all.filter((f) => idSet.has(f.id) && f.status === "FINISHED");
  }
}
