import type {
  AccuracyStats,
  Fixture,
  LockedPrediction,
  MatchGrading,
  MatchResult,
} from "../types.js";
import { setResult, setStats } from "../storage/blobs.js";
import { computeStats, gradeMatch } from "./scoring.js";

/**
 * Predictions eligible for accuracy grading.
 * Final locks always count; early estimates count only once the match is finished
 * (e.g. final pass missed before kick-off).
 */
export function isGradablePrediction(
  prediction: LockedPrediction,
  fixture?: Fixture
): boolean {
  const phase = prediction.phase ?? "final";
  if (phase === "final") return true;
  return fixture?.status === "FINISHED";
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
  results: Record<string, MatchResult>,
  fixtures: Fixture[] = []
): MatchGrading[] {
  const gradings: MatchGrading[] = [];
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

  for (const [id, prediction] of Object.entries(predictions)) {
    const fixture = fixtureById.get(prediction.matchId);
    if (!isGradablePrediction(prediction, fixture)) continue;
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
    if (prediction && isGradablePrediction(prediction, fixture)) {
      await setResult(fromFixture);
      settled++;
    }

    results[key] = fromFixture;
  }

  const stats = computeStats(buildGradings(predictions, results, fixtures));
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
