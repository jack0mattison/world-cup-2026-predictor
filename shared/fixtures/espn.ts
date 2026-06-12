import type { Fixture, MatchStatus } from "../types.js";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

/** ESPN abbreviations that differ from football-data TLAs */
const TLA_ALIASES: Record<string, string> = {
  KORS: "KOR",
  ENG: "ENG",
  SUI: "SUI",
  GER: "GER",
};

interface EspnCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: { abbreviation: string };
}

interface EspnEvent {
  status?: {
    type?: { state?: string; name?: string };
    detail?: string;
  };
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
}

function normalizeTla(tla: string): string {
  const upper = tla.toUpperCase();
  return TLA_ALIASES[upper] ?? upper;
}

function tlasMatch(a: string, b: string): boolean {
  return normalizeTla(a) === normalizeTla(b);
}

function parseMinute(detail?: string): number | undefined {
  if (!detail) return undefined;
  const m = detail.match(/(\d+)\s*'/);
  return m ? parseInt(m[1], 10) : undefined;
}

function espnStateToStatus(state: string | undefined, fallback: MatchStatus): MatchStatus {
  switch (state) {
    case "in":
      return "LIVE";
    case "post":
      return "FINISHED";
    case "pre":
      return "SCHEDULED";
    default:
      return fallback;
  }
}

function toEspnDate(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

async function fetchEspnScoreboard(date: string): Promise<EspnEvent[]> {
  const res = await fetch(`${ESPN_SCOREBOARD}?dates=${date}`);
  if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

function mapEspnEvent(event: EspnEvent, fixtures: Fixture[]): Fixture | null {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors;
  if (!competitors?.length) return null;

  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.abbreviation || !away?.team?.abbreviation) return null;

  const fixture = fixtures.find(
    (f) =>
      tlasMatch(f.homeTeam.tla, home.team.abbreviation) &&
      tlasMatch(f.awayTeam.tla, away.team.abbreviation)
  );
  if (!fixture) return null;

  const homeScore = Number.parseInt(home.score, 10);
  const awayScore = Number.parseInt(away.score, 10);
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) return null;

  const state = event.status?.type?.state;
  if (state === "pre") return null;

  const status = espnStateToStatus(state, fixture.status);
  const minute = status === "LIVE" ? parseMinute(event.status?.detail) : undefined;

  let winner: "HOME" | "AWAY" | "DRAW" | undefined;
  if (homeScore > awayScore) winner = "HOME";
  else if (awayScore > homeScore) winner = "AWAY";
  else winner = "DRAW";

  return {
    ...fixture,
    status,
    score: { home: homeScore, away: awayScore, winner },
    minute,
  };
}

export function fixturesNeedEspnRefresh(fixtures: Fixture[]): boolean {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  return fixtures.some((f) => {
    const hoursFromKickoff = (now - new Date(f.utcDate).getTime()) / hourMs;
    return hoursFromKickoff >= -6 && hoursFromKickoff <= 18;
  });
}

function espnDatesForKickoff(utcDate: string): string[] {
  const kickoff = new Date(utcDate);
  const dates = new Set<string>();
  for (const dayOffset of [-1, 0, 1]) {
    const d = new Date(kickoff);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    dates.add(toEspnDate(d.toISOString()));
  }
  return [...dates];
}

/** Supplement football-data with ESPN live scores (no API key, updates in real time). */
export async function fetchEspnLiveUpdates(fixtures: Fixture[]): Promise<Fixture[]> {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const relevant = fixtures.filter((f) => {
    const hoursFromKickoff = (now - new Date(f.utcDate).getTime()) / hourMs;
    return hoursFromKickoff >= -6 && hoursFromKickoff <= 18;
  });
  if (relevant.length === 0) return [];

  const dates = new Set<string>();
  for (const f of relevant) {
    for (const d of espnDatesForKickoff(f.utcDate)) dates.add(d);
  }
  const updates: Fixture[] = [];

  for (const date of dates) {
    try {
      const events = await fetchEspnScoreboard(date);
      for (const event of events) {
        const mapped = mapEspnEvent(event, fixtures);
        if (mapped) updates.push(mapped);
      }
    } catch (err) {
      console.warn(`ESPN scoreboard failed for ${date}:`, err);
    }
  }

  return updates;
}
