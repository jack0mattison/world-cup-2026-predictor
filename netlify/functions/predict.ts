import type { Handler } from "@netlify/functions";
import { runPredictions } from "../../shared/prediction/runner.js";

/** Manual invoke / local testing — scheduled runs use predict-background */
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
