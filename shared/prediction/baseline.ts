import { computeBaseline } from "../elo/model.js";
import type {
  BaselinePrediction,
  Confidence,
  Fixture,
  LockedPrediction,
  PredictionPhase,
  PredictionProbabilities,
} from "../types.js";

function deriveConfidence(probs: PredictionProbabilities): Confidence {
  const sorted = [probs.home, probs.draw, probs.away].sort((a, b) => b - a);
  const spread = sorted[0] - sorted[1];
  if (spread >= 25) return "high";
  if (spread >= 15) return "medium";
  return "low";
}

function buildRationale(fixture: Fixture, baseline: BaselinePrediction): string {
  const { homeElo, awayElo, extraTimeLikely } = baseline;
  const diff = Math.abs(homeElo - awayElo);
  const fav =
    baseline.probabilities.home >= baseline.probabilities.away
      ? fixture.homeTeam.shortName
      : fixture.awayTeam.shortName;

  let text = `Elo baseline: ${fixture.homeTeam.shortName} (${homeElo}) vs ${fixture.awayTeam.shortName} (${awayElo}). `;
  text += diff < 50 ? "Evenly matched on ratings. " : `${fav} favoured by ${Math.round(diff)} Elo points. `;
  if (extraTimeLikely) text += "Knockout tie likely — extra time possible. ";
  if (!fixture.knockout) text += `Group-stage draw rate modelled at ~24%.`;
  return text;
}

export function generateBaselinePrediction(
  fixture: Fixture,
  phase: PredictionPhase = "final"
): LockedPrediction {
  const baseline = computeBaseline(fixture);
  const now = new Date().toISOString();
  const rationale =
    phase === "early"
      ? `${buildRationale(fixture, baseline)} Early estimate — refines 2–4h before kick-off when lineups and team news are clearer.`
      : buildRationale(fixture, baseline);

  return {
    matchId: fixture.id,
    phase,
    generatedAt: now,
    lockedAt: now,
    kickoff: fixture.utcDate,
    baseline,
    final: {
      probabilities: baseline.probabilities,
      scoreline: baseline.scoreline,
      confidence: deriveConfidence(baseline.probabilities),
      rationale,
    },
    source: "baseline",
  };
}
