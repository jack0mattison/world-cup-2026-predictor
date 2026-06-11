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

/** M2: enable schedule when LLM+Brave layer is live */
export const config: Config = {};

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
  }

  return { generated, skipped };
}

/** Background function variant for LLM+search batches (M2) — 15 min limit */
export const handler: Handler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const result = await runPredictions();
    console.log("predict-background complete:", result);
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error("predict-background error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
