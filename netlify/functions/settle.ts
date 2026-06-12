import type { Config, Handler } from "@netlify/functions";
import { ensureFixtures } from "../../shared/fixtures/sync.js";
import { refreshAccuracyStats } from "../../shared/prediction/settlement.js";
import { connectBlobs } from "../../shared/storage/connect-blobs.js";
import {
  getAllPredictions,
  getAllResults,
} from "../../shared/storage/blobs.js";

export const config: Config = {
  schedule: "0 */2 * * *",
};

export const handler: Handler = async (event) => {
  connectBlobs(event);
  try {
    const fixtures = await ensureFixtures(true);
    const [predictions, existingResults] = await Promise.all([
      getAllPredictions(),
      getAllResults(),
    ]);

    const { stats, settled, results } = await refreshAccuracyStats(
      fixtures,
      predictions,
      existingResults
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        settled,
        totalGraded: stats.totalMatches,
        outcomeAccuracy: stats.outcomeAccuracy,
        resultsCount: Object.keys(results).length,
      }),
    };
  } catch (err) {
    console.error("settle error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
