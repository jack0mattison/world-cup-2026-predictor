import { setIngestMeta } from "../storage/blobs.js";
import type { Fixture } from "../types.js";
import { FootballDataProvider } from "./football-data.js";
import type { FixturesProvider } from "./provider.js";
import { getSampleFixtures, isSampleFixtures } from "./sample.js";

export type { FixturesProvider } from "./provider.js";
export { hasFootballDataApiKey } from "../config.js";

export function createFixturesProvider(): FixturesProvider {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (apiKey) {
    return new FootballDataProvider(apiKey);
  }
  return {
    name: "sample",
    async fetchFixtures() {
      return getSampleFixtures();
    },
    async fetchResults(matchIds) {
      const fixtures = getSampleFixtures();
      const idSet = new Set(matchIds);
      return fixtures.filter((f) => idSet.has(f.id) && f.status === "FINISHED");
    },
  };
}

export async function refreshFixtures(
  provider: FixturesProvider,
  existing?: Fixture[]
): Promise<Fixture[]> {
  try {
    const fixtures = await provider.fetchFixtures();
    if (fixtures.length === 0) throw new Error("Provider returned empty fixture list");
    const source = provider.name === "football-data.org" ? "football-data.org" : "sample";
    await setIngestMeta({ fixtureSource: source, lastIngestError: null });
    return fixtures;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Fixture fetch failed (${provider.name}):`, message);
    await setIngestMeta({ lastIngestError: message });
    if (existing?.length && !isSampleFixtures(existing)) return existing;
    console.warn("Falling back to sample fixtures");
    const sample = getSampleFixtures();
    await setIngestMeta({ fixtureSource: "sample" });
    return sample;
  }
}

export { isSampleFixtures } from "./sample.js";

export { ensureFixtures } from "./sync.js";
