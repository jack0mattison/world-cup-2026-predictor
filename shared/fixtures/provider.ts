import type { Fixture } from "../types.js";

export interface FixturesProvider {
  readonly name: string;
  fetchFixtures(): Promise<Fixture[]>;
  fetchResults(matchIds: number[]): Promise<Fixture[]>;
}
