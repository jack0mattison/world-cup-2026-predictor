import type { Handler } from "@netlify/functions";
import { hasLiveOrRecentMatches } from "../../shared/fixtures/live.js";
import { ensureFixtures } from "../../shared/fixtures/sync.js";
import { getFixtures, loadAppData } from "../../shared/storage/blobs.js";

export const handler: Handler = async (event) => {
  try {
    const force =
      event.queryStringParameters?.refresh === "1" ||
      event.queryStringParameters?.live === "1";
    await ensureFixtures(force);
    const data = await loadAppData();
    const liveActive = hasLiveOrRecentMatches(await getFixtures());
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": liveActive ? "public, max-age=15" : "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("api-data error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load data" }),
    };
  }
};
