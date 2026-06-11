import { createFixturesProvider, refreshFixtures } from "../fixtures/index.js";
import type { Fixture } from "../types.js";
import {
  getFixtures,
  getPrediction,
  setFixtures,
  setPrediction,
} from "../storage/blobs.js";
import { isLlmLayerEnabled } from "../config.js";
import { generatePrediction } from "./generate.js";

export const LOOKAHEAD_MIN_HOURS = 2;
export const LOOKAHEAD_MAX_HOURS = 4;

export interface PredictRunResult {
  generated: number;
  skipped: number;
  llmEnabled: boolean;
  errors: string[];
}

function fixturesInWindow(fixtures: Fixture[], now: number): Fixture[] {
  const minMs = LOOKAHEAD_MIN_HOURS * 60 * 60 * 1000;
  const maxMs = LOOKAHEAD_MAX_HOURS * 60 * 60 * 1000;

  return fixtures.filter((fixture) => {
    if (fixture.status !== "SCHEDULED") return false;
    const timeUntil = new Date(fixture.utcDate).getTime() - now;
    return timeUntil >= minMs && timeUntil <= maxMs;
  });
}

export async function runPredictions(): Promise<PredictRunResult> {
  const provider = createFixturesProvider();
  const existing = await getFixtures();
  const fixtures = await refreshFixtures(provider, existing);
  await setFixtures(fixtures);

  const now = Date.now();
  const due = fixturesInWindow(fixtures, now);
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const fixture of due) {
    const existingPred = await getPrediction(fixture.id);
    if (existingPred) {
      skipped++;
      continue;
    }

    try {
      const prediction = await generatePrediction(fixture);
      await setPrediction(prediction);
      generated++;
      console.log(
        `Locked ${prediction.source} prediction for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${fixture.id}: ${msg}`);
      console.error(`Failed to predict match ${fixture.id}:`, err);
    }
  }

  return {
    generated,
    skipped,
    llmEnabled: isLlmLayerEnabled(),
    errors,
  };
}
