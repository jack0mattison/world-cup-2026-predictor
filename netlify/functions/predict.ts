import type { Config, Handler } from "@netlify/functions";
import { createFixturesProvider, refreshFixtures } from "../../shared/fixtures/index.js";
import { generateBaselinePrediction } from "../../shared/prediction/index.js";
import {
  getFixtures,
  getPrediction,
  setFixtures,
  setPrediction,
} from "../../shared/storage/blobs.js";

const LOOKAHEAD_MIN_HOURS = 2;
const LOOKAHEAD_MAX_HOURS = 4;

export const config: Config = {
  schedule: "@hourly",
};

async function runPredictions(): Promise<{ generated: number; skipped: number }> {
  const provider = createFixturesProvider();
  const existing = await getFixtures();
  const fixtures = await refreshFixtures(provider, existing);
  await setFixtures(fixtures);

  const now = Date.now();
  const minMs = LOOKAHEAD_MIN_HOURS * 60 * 60 * 1000;
  const maxMs = LOOKAHEAD_MAX_HOURS * 60 * 60 * 1000;

  let generated = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    if (fixture.status !== "SCHEDULED") continue;

    const kickoff = new Date(fixture.utcDate).getTime();
    const timeUntil = kickoff - now;

    if (timeUntil < minMs || timeUntil > maxMs) continue;

    const existingPred = await getPrediction(fixture.id);
    if (existingPred) {
      skipped++;
      continue;
    }

    const prediction = generateBaselinePrediction(fixture);
    await setPrediction(prediction);
    generated++;
    console.log(
      `Locked prediction for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}:`,
      prediction.final.probabilities
    );
  }

  return { generated, skipped };
}

export const handler: Handler = async () => {
  try {
    const result = await runPredictions();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, ...result }),
    };
  } catch (err) {
    console.error("predict error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
