import type { Fixture } from "../types.js";
import { FootballDataProvider } from "./football-data.js";
import type { FixturesProvider } from "./provider.js";
import { getSampleFixtures } from "./sample.js";

export type { FixturesProvider } from "./provider.js";

export function createFixturesProvider(): FixturesProvider {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
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
    return fixtures;
  } catch (err) {
    console.error(`Fixture fetch failed (${provider.name}):`, err);
    if (existing?.length) return existing;
    console.warn("Falling back to sample fixtures");
    return getSampleFixtures();
  }
}

export { ensureFixtures } from "./sync.js";
