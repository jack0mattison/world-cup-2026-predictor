import { ensureFixtures } from "../fixtures/sync.js";
import type { LockedPrediction, PredictionPhase } from "../types.js";
import {
  getFixtures,
  getPrediction,
  setPrediction,
  setPredictRunMeta,
} from "../storage/blobs.js";
import { isLlmLayerEnabled } from "../config.js";
import { generateBaselinePrediction } from "./baseline.js";
import { generatePrediction } from "./generate.js";
import {
  findMissedFinalizations,
  fixturesNeedingEarly,
  fixturesNeedingFinal,
} from "./schedule.js";

export {
  EARLY_MAX_HOURS,
  EARLY_MIN_HOURS,
  FINAL_AFTER_KICKOFF_HOURS,
  FINAL_MAX_HOURS,
} from "./schedule.js";

export interface PredictRunResult {
  generatedEarly: number;
  generatedFinal: number;
  skipped: number;
  dueEarly: number[];
  dueFinal: number[];
  missedFinalizations: number[];
  llmEnabled: boolean;
  errors: string[];
  ranAt: string;
}

function predictionPhase(pred: LockedPrediction | null): PredictionPhase | null {
  if (!pred) return null;
  return pred.phase ?? "final";
}

export async function runPredictions(): Promise<PredictRunResult> {
  const ranAt = new Date().toISOString();
  const phaseById = new Map<number, PredictionPhase | null>();

  const getPhase = (id: number): PredictionPhase | null => {
    if (!phaseById.has(id)) return null;
    return phaseById.get(id) ?? null;
  };

  const existing = await getFixtures();
  for (const f of existing) {
    const pred = await getPrediction(f.id);
    phaseById.set(f.id, predictionPhase(pred));
  }

  const fixtures = await ensureFixtures(true);
  for (const f of fixtures) {
    if (!phaseById.has(f.id)) {
      const pred = await getPrediction(f.id);
      phaseById.set(f.id, predictionPhase(pred));
    }
  }

  const now = Date.now();
  const earlyDue = fixturesNeedingEarly(fixtures, now, getPhase);
  const finalDue = fixturesNeedingFinal(fixtures, now, getPhase);
  const missed = findMissedFinalizations(fixtures, now, getPhase);

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
      phaseById.set(fixture.id, "early");
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
      phaseById.set(fixture.id, "final");
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

  const result: PredictRunResult = {
    generatedEarly,
    generatedFinal,
    skipped,
    dueEarly: earlyDue.map((f) => f.id),
    dueFinal: finalDue.map((f) => f.id),
    missedFinalizations: missed.map((f) => f.id),
    llmEnabled: isLlmLayerEnabled(),
    errors,
    ranAt,
  };

  if (missed.length > 0) {
    console.warn(
      "Missed final predictions (finished without final lock):",
      missed.map((f) => `${f.id} ${f.homeTeam.tla} vs ${f.awayTeam.tla}`)
    );
  }

  await setPredictRunMeta({
    lastRunAt: ranAt,
    lastResult: result,
  });

  return result;
}
