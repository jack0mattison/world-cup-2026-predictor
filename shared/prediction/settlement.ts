import type {
  AccuracyStats,
  Fixture,
  LockedPrediction,
  MatchGrading,
  MatchResult,
} from "../types.js";
import { setResult, setStats } from "../storage/blobs.js";
import { computeStats, gradeMatch } from "./scoring.js";

/** Predictions eligible for accuracy grading (final lock, or legacy without phase). */
export function isGradablePrediction(prediction: LockedPrediction): boolean {
  const phase = prediction.phase ?? "final";
  return phase === "final";
}

export function resultFromFixture(fixture: Fixture): MatchResult | null {
  if (fixture.status !== "FINISHED" || !fixture.score) return null;
  const home = fixture.score.home;
  const away = fixture.score.away;
  if (home == null || away == null) return null;

  return {
    matchId: fixture.id,
    homeScore: home,
    awayScore: away,
    winner: fixture.score.winner ?? (home > away ? "HOME" : away > home ? "AWAY" : "DRAW"),
    settledAt: new Date().toISOString(),
  };
}

export function buildGradings(
  predictions: Record<string, LockedPrediction>,
  results: Record<string, MatchResult>
): MatchGrading[] {
  const gradings: MatchGrading[] = [];

  for (const [id, prediction] of Object.entries(predictions)) {
    if (!isGradablePrediction(prediction)) continue;
    const result = results[id];
    if (result) gradings.push(gradeMatch(prediction, result));
  }

  return gradings;
}

/**
 * Settle finished fixtures, recompute accuracy stats, and persist both.
 * Safe to call on every API read — stats are derived from current predictions + results.
 */
export async function refreshAccuracyStats(
  fixtures: Fixture[],
  predictions: Record<string, LockedPrediction>,
  existingResults: Record<string, MatchResult>
): Promise<{ stats: AccuracyStats; settled: number; results: Record<string, MatchResult> }> {
  const results = { ...existingResults };
  let settled = 0;

  for (const fixture of fixtures) {
    if (fixture.status !== "FINISHED") continue;

    const key = String(fixture.id);
    if (results[key]) continue;

    const fromFixture = resultFromFixture(fixture);
    if (!fromFixture) continue;

    const prediction = predictions[key];
    if (prediction && isGradablePrediction(prediction)) {
      await setResult(fromFixture);
      settled++;
    }

    results[key] = fromFixture;
  }

  const stats = computeStats(buildGradings(predictions, results));
  await setStats(stats);

  return { stats, settled, results };
}

/** @deprecated Use refreshAccuracyStats — kept for direct unit-style imports */
export async function settleFinishedMatches(
  fixtures: Fixture[],
  predictions: Record<string, LockedPrediction>
): Promise<{ settled: number; results: Record<string, MatchResult> }> {
  const { settled, results } = await refreshAccuracyStats(fixtures, predictions, {});
  return { settled, results };
}
