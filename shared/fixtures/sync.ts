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
import { needsLiveFixtureRefresh } from "./live.js";
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
  const fixtures = await refreshFixtures(provider, existing);
  if (fixtures.length > 0) {
    await setFixtures(fixtures);
    await setFixturesRefreshedAt(new Date().toISOString());
  }
  return fixtures;
}
