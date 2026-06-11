import type { Fixture } from "../types.js";

const LIVE_REFRESH_MS = 60 * 1000;
const RECENTLY_STARTED_MS = 3 * 60 * 60 * 1000;

export function hasLiveOrRecentMatches(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (f.status === "LIVE") return true;
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
  if (fixture.status !== "LIVE") return null;
  if (fixture.minute === undefined) return "LIVE";
  const extra = fixture.injuryTime ? `+${fixture.injuryTime}` : "";
  return `${fixture.minute}${extra}'`;
}
