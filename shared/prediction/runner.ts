import { createFixturesProvider, refreshFixtures } from "../fixtures/index.js";
import type { Fixture, LockedPrediction, PredictionPhase } from "../types.js";
import {
  getFixtures,
  getPrediction,
  setFixtures,
  setPrediction,
} from "../storage/blobs.js";
import { isLlmLayerEnabled } from "../config.js";
import { generateBaselinePrediction } from "./baseline.js";
import { generatePrediction } from "./generate.js";

/** Final prediction window — full LLM + Brave context */
export const FINAL_MIN_HOURS = 2;
export const FINAL_MAX_HOURS = 4;

/** Early estimate window — cheap Elo baseline only */
export const EARLY_MIN_HOURS = 4;
export const EARLY_MAX_HOURS = 12;

export interface PredictRunResult {
  generatedEarly: number;
  generatedFinal: number;
  skipped: number;
  llmEnabled: boolean;
  errors: string[];
}

function predictionPhase(pred: LockedPrediction | null): PredictionPhase | null {
  if (!pred) return null;
  return pred.phase ?? "final";
}

function fixturesInEarlyWindow(fixtures: Fixture[], now: number): Fixture[] {
  const minMs = EARLY_MIN_HOURS * 60 * 60 * 1000;
  const maxMs = EARLY_MAX_HOURS * 60 * 60 * 1000;

  return fixtures.filter((fixture) => {
    if (fixture.status !== "SCHEDULED") return false;
    const timeUntil = new Date(fixture.utcDate).getTime() - now;
    return timeUntil > minMs && timeUntil <= maxMs;
  });
}

function fixturesInFinalWindow(fixtures: Fixture[], now: number): Fixture[] {
  const minMs = FINAL_MIN_HOURS * 60 * 60 * 1000;
  const maxMs = FINAL_MAX_HOURS * 60 * 60 * 1000;

  return fixtures.filter((fixture) => {
    if (fixture.status !== "SCHEDULED") return false;
    const timeUntil = new Date(fixture.utcDate).getTime() - now;
    const inWindow = timeUntil >= minMs && timeUntil <= maxMs;
    const catchUp = timeUntil > 0 && timeUntil < minMs;
    return inWindow || catchUp;
  });
}

export async function runPredictions(): Promise<PredictRunResult> {
  const provider = createFixturesProvider();
  const existing = await getFixtures();
  const fixtures = await refreshFixtures(provider, existing);
  await setFixtures(fixtures);

  const now = Date.now();
  const earlyDue = fixturesInEarlyWindow(fixtures, now);
  const finalDue = fixturesInFinalWindow(fixtures, now);
  let generatedEarly = 0;
  let generatedFinal = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const fixture of earlyDue) {
    const existingPred = await getPrediction(fixture.id);
    if (predictionPhase(existingPred)) {
      skipped++;
      continue;
    }

    try {
      const prediction = generateBaselinePrediction(fixture, "early");
      await setPrediction(prediction);
      generatedEarly++;
      console.log(
        `Early estimate for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${fixture.id} early: ${msg}`);
      console.error(`Failed early prediction for match ${fixture.id}:`, err);
    }
  }

  for (const fixture of finalDue) {
    const existingPred = await getPrediction(fixture.id);
    if (predictionPhase(existingPred) === "final") {
      skipped++;
      continue;
    }

    try {
      const prediction = await generatePrediction(fixture);
      await setPrediction({ ...prediction, phase: "final" });
      generatedFinal++;
      console.log(
        `Final ${prediction.source} prediction for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${fixture.id} final: ${msg}`);
      console.error(`Failed final prediction for match ${fixture.id}:`, err);
    }
  }

  return {
    generatedEarly,
    generatedFinal,
    skipped,
    llmEnabled: isLlmLayerEnabled(),
    errors,
  };
}
