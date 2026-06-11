import type { Handler } from "@netlify/functions";
import { runPredictions } from "../../shared/prediction/runner.js";
import { connectBlobs } from "../../shared/storage/connect-blobs.js";
import { getAllPredictions } from "../../shared/storage/blobs.js";

/** Manual invoke / local testing — scheduled runs use predict-background */
export const handler: Handler = async (event) => {
  connectBlobs(event);
  try {
    const result = await runPredictions();
    const predictions = await getAllPredictions();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        ...result,
        storedPredictions: Object.keys(predictions).length,
        matchIds: Object.keys(predictions),
      }),
    };
  } catch (err) {
    console.error("predict error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
