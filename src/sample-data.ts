import { getSampleFixtures } from "../shared/fixtures/sample.js";
import { generateBaselinePrediction } from "../shared/prediction/baseline.js";
import { gradeMatch } from "../shared/prediction/scoring.js";
import type { AppData, MatchResult } from "../shared/types.js";

/** Client-side fallback when API unavailable (local Vite dev) */
export function getDevSampleData(): AppData {
  const fixtures = getSampleFixtures();
  const predictions: AppData["predictions"] = {};
  const results: AppData["results"] = {};

  for (const fixture of fixtures) {
    if (fixture.status === "SCHEDULED" || fixture.status === "FINISHED") {
      predictions[String(fixture.id)] = generateBaselinePrediction(fixture);
    }
    if (fixture.status === "FINISHED" && fixture.score) {
      const result: MatchResult = {
        matchId: fixture.id,
        homeScore: fixture.score.home ?? 0,
        awayScore: fixture.score.away ?? 0,
        winner: fixture.score.winner ?? "DRAW",
        settledAt: new Date().toISOString(),
      };
      results[String(fixture.id)] = result;
    }
  }

  const gradings = Object.entries(predictions)
    .filter(([id]) => results[id])
    .map(([id, pred]) => gradeMatch(pred, results[id]));

  const total = gradings.length;
  const outcomeCorrect = gradings.filter((g) => g.outcomeCorrect).length;
  const exactScores = gradings.filter((g) => g.exactScore).length;
  const closeScores = gradings.filter((g) => g.closeScore).length;
  const correctGoalDiffs = gradings.filter((g) => g.correctGoalDiff).length;
  const avgBrier = total ? gradings.reduce((s, g) => s + g.brierScore, 0) / total : 0;
  const baselineCorrect = gradings.filter((g) => g.baselineOutcomeCorrect).length;
  const avgBaselineBrier = total
    ? gradings.reduce((s, g) => s + g.baselineBrierScore, 0) / total
    : 0;

  return {
    fixtures,
    predictions,
    results,
    stats: total
      ? {
          updatedAt: new Date().toISOString(),
          totalMatches: total,
          outcomeAccuracy: Math.round((outcomeCorrect / total) * 1000) / 10,
          exactScoreRate: Math.round((exactScores / total) * 1000) / 10,
          closeScoreRate: Math.round((closeScores / total) * 1000) / 10,
          correctGoalDiffRate: Math.round((correctGoalDiffs / total) * 1000) / 10,
          avgBrierScore: Math.round(avgBrier * 1000) / 1000,
          baselineOutcomeAccuracy: Math.round((baselineCorrect / total) * 1000) / 10,
          baselineAvgBrierScore: Math.round(avgBaselineBrier * 1000) / 1000,
          gradings,
        }
      : null,
    lastRefreshed: new Date().toISOString(),
    meta: {
      fixtureSource: "sample",
      apiKeyConfigured: false,
      lastIngestError: null,
      fixtureCount: fixtures.length,
    },
  };
}
