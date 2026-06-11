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
  id: number | null;
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
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

function mapTeam(t: FootballDataTeam | null | undefined, fallback = "TBD"): Team {
  const name = t?.name?.trim() || fallback;
  return {
    id: t?.id ?? 0,
    name,
    shortName: t?.shortName?.trim() || name,
    tla: t?.tla?.trim() || name.slice(0, 3).toUpperCase(),
    crest: t?.crest ?? undefined,
  };
}

function isPlayableMatch(m: FootballDataMatch): boolean {
  return Boolean(m.id && m.utcDate && m.homeTeam?.name && m.awayTeam?.name);
}

function normalizeStatus(apiStatus: string): MatchStatus {
  switch (apiStatus) {
    case "TIMED":
    case "SCHEDULED":
      return "SCHEDULED";
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "LIVE";
    case "FINISHED":
      return "FINISHED";
    case "POSTPONED":
      return "POSTPONED";
    case "CANCELLED":
    case "SUSPENDED":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
}

function normalizeGroup(group: string | null | undefined): string | undefined {
  if (!group) return undefined;
  return group.replace(/^GROUP_/, "");
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
    status: normalizeStatus(m.status),
    stage,
    group: normalizeGroup(m.group),
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
    const paths = [
      "/competitions/WC/matches?season=2026",
      "/competitions/WC/matches",
    ];
    let lastError: Error | undefined;

    for (const path of paths) {
      try {
        const data = (await this.fetch(path)) as { matches?: FootballDataMatch[] };
        const matches = data.matches ?? [];
        const fixtures = matches
          .filter(isPlayableMatch)
          .map(mapMatch)
          .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

        if (fixtures.length === 0) {
          throw new Error(`football-data.org returned no playable matches for ${path}`);
        }
        return fixtures;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError ?? new Error("football-data.org returned no WC matches");
  }

  async fetchResults(matchIds: number[]): Promise<Fixture[]> {
    if (matchIds.length === 0) return [];
    const all = await this.fetchFixtures();
    const idSet = new Set(matchIds);
    return all.filter((f) => idSet.has(f.id) && f.status === "FINISHED");
  }
}
