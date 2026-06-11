import {
  getFixtures,
  getFixturesRefreshedAt,
  setFixtures,
  setFixturesRefreshedAt,
} from "../storage/blobs.js";
import type { Fixture } from "../types.js";
import {
  createFixturesProvider,
  hasFootballDataApiKey,
  refreshFixtures,
} from "./index.js";
import { FootballDataProvider } from "./football-data.js";
import { needsLiveFixtureRefresh } from "./live.js";
import { mergeFixtures } from "./merge.js";
import { isSampleFixtures } from "./sample.js";

const STALE_MS = 24 * 60 * 60 * 1000;

export async function ensureFixtures(force = false): Promise<Fixture[]> {
  const existing = await getFixtures();
  const refreshedAt = await getFixturesRefreshedAt();
  const stale =
    !refreshedAt || Date.now() - new Date(refreshedAt).getTime() > STALE_MS;
  const liveStale = needsLiveFixtureRefresh(existing, refreshedAt);
  const cachedSampleWithKey =
    hasFootballDataApiKey() && isSampleFixtures(existing);

  if (!force && cachedSampleWithKey) {
    force = true;
  }

  if (!force && existing.length > 0 && !stale && !liveStale) {
    return existing;
  }

  const provider = createFixturesProvider();
  let fixtures = await refreshFixtures(provider, existing);

  if (provider instanceof FootballDataProvider && (liveStale || force)) {
    try {
      const liveUpdates = await provider.fetchLiveSnapshot(fixtures);
      fixtures = mergeFixtures(fixtures, liveUpdates);
    } catch (err) {
      console.warn("Live snapshot merge failed:", err);
    }
  }

  if (fixtures.length > 0) {
    await setFixtures(fixtures);
    await setFixturesRefreshedAt(new Date().toISOString());
  }
  return fixtures;
}
