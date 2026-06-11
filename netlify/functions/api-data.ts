import type { Handler } from "@netlify/functions";
import { ensureFixtures } from "../../shared/fixtures/sync.js";
import { loadAppData } from "../../shared/storage/blobs.js";

export const handler: Handler = async () => {
  try {
    await ensureFixtures();
    const data = await loadAppData();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
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
