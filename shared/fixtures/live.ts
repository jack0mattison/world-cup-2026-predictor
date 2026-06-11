import type { Fixture, MatchStatus } from "../types.js";

const LIVE_REFRESH_MS = 60 * 1000;
const RECENTLY_STARTED_MS = 3 * 60 * 60 * 1000;
/** 90 mins + allowance for HT and stoppage */
const MATCH_WINDOW_MS = 115 * 60 * 1000;

export function isEffectivelyLive(fixture: Fixture): boolean {
  if (fixture.status === "LIVE") return true;
  if (
    fixture.status === "FINISHED" ||
    fixture.status === "CANCELLED" ||
    fixture.status === "POSTPONED"
  ) {
    return false;
  }
  const kickoff = new Date(fixture.utcDate).getTime();
  const now = Date.now();
  return kickoff <= now && now - kickoff < MATCH_WINDOW_MS;
}

export function effectiveStatus(fixture: Fixture): MatchStatus {
  if (fixture.status === "LIVE" || fixture.status === "FINISHED") return fixture.status;
  return isEffectivelyLive(fixture) ? "LIVE" : fixture.status;
}

export function hasLiveOrRecentMatches(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (f.status === "LIVE" || isEffectivelyLive(f)) return true;
    if (f.status === "FINISHED" || f.status === "CANCELLED") return false;
    const kickoff = new Date(f.utcDate).getTime();
    return kickoff <= now && now - kickoff < RECENTLY_STARTED_MS;
  });
}

export function needsLiveFixtureRefresh(
  fixtures: Fixture[],
  refreshedAt: string | null
): boolean {
  if (!hasLiveOrRecentMatches(fixtures)) return false;
  if (!refreshedAt) return true;
  return Date.now() - new Date(refreshedAt).getTime() > LIVE_REFRESH_MS;
}

export function formatLiveMinute(fixture: Fixture): string | null {
  if (!isEffectivelyLive(fixture)) return null;
  if (fixture.minute !== undefined) {
    const extra = fixture.injuryTime ? `+${fixture.injuryTime}` : "";
    return `${fixture.minute}${extra}'`;
  }
  const elapsed = Math.floor((Date.now() - new Date(fixture.utcDate).getTime()) / 60000);
  if (elapsed > 0 && elapsed <= 120) return `~${elapsed}'`;
  return "LIVE";
}
