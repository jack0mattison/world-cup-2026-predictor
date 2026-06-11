import type { Config, Handler } from "@netlify/functions";
import { createFixturesProvider, refreshFixtures } from "../../shared/fixtures/index.js";
import { computeStats, gradeMatch } from "../../shared/prediction/index.js";
import type { MatchResult } from "../../shared/types.js";
import {
  getAllPredictions,
  getFixtures,
  getResult,
  setFixtures,
  setResult,
  setStats,
} from "../../shared/storage/blobs.js";

export const config: Config = {
  schedule: "0 */2 * * *",
};

export const handler: Handler = async () => {
  try {
    const provider = createFixturesProvider();
    const existing = await getFixtures();
    const fixtures = await refreshFixtures(provider, existing);
    await setFixtures(fixtures);

    const predictions = await getAllPredictions();
    const finished = fixtures.filter((f) => f.status === "FINISHED" && f.score);

    let settled = 0;
    for (const fixture of finished) {
      const existingResult = await getResult(fixture.id);
      if (existingResult) continue;

      const prediction = predictions[String(fixture.id)];
      if (!prediction) continue;

      const result: MatchResult = {
        matchId: fixture.id,
        homeScore: fixture.score!.home ?? 0,
        awayScore: fixture.score!.away ?? 0,
        winner: fixture.score!.winner ?? "DRAW",
        settledAt: new Date().toISOString(),
      };
      await setResult(result);
      settled++;
    }

    const allPredictions = await getAllPredictions();
    const gradings = [];
    for (const [id, prediction] of Object.entries(allPredictions)) {
      const result = await getResult(Number(id));
      if (result) {
        gradings.push(gradeMatch(prediction, result));
      }
    }

    const stats = computeStats(gradings);
    await setStats(stats);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        settled,
        totalGraded: gradings.length,
        outcomeAccuracy: stats.outcomeAccuracy,
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
