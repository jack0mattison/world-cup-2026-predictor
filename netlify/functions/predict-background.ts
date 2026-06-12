import type { Config, Handler } from "@netlify/functions";
import { runPredictions } from "../../shared/prediction/runner.js";
import { connectBlobs } from "../../shared/storage/connect-blobs.js";

export const config: Config = {
  /** Every 30 min — final window is 0–4h before KO; hourly was too easy to miss */
  schedule: "*/30 * * * *",
};

/** Background function (15 min) — Brave Search + OpenRouter LLM batches */
export const handler: Handler = async (event, context) => {
  connectBlobs(event);
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
