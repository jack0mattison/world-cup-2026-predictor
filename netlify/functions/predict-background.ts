import type { Config, Handler } from "@netlify/functions";
import { runPredictions } from "../../shared/prediction/runner.js";

export const config: Config = {
  schedule: "@hourly",
};

/** Background function (15 min) — Brave Search + OpenRouter LLM batches */
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
