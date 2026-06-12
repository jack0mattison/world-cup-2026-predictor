import type {
  AccuracyStats,
  LockedPrediction,
  MatchGrading,
  MatchResult,
  PredictionProbabilities,
} from "../types.js";

type Outcome = "HOME" | "DRAW" | "AWAY";

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getPredictedOutcome(probs: PredictionProbabilities): Outcome {
  const { home, draw, away } = probs;
  if (home >= draw && home >= away) return "HOME";
  if (away >= draw && away >= home) return "AWAY";
  return "DRAW";
}

/** Brier score for a three-way outcome (lower is better, 0 = perfect) */
export function brierScore(
  probs: PredictionProbabilities,
  actual: Outcome
): number {
  const actuals = {
    home: actual === "HOME" ? 1 : 0,
    draw: actual === "DRAW" ? 1 : 0,
    away: actual === "AWAY" ? 1 : 0,
  };
  const pHome = probs.home / 100;
  const pDraw = probs.draw / 100;
  const pAway = probs.away / 100;
  return (
    Math.pow(pHome - actuals.home, 2) +
    Math.pow(pDraw - actuals.draw, 2) +
    Math.pow(pAway - actuals.away, 2)
  );
}

export function gradeMatch(
  prediction: LockedPrediction,
  result: MatchResult
): MatchGrading {
  const actual = getOutcome(result.homeScore, result.awayScore);
  const predicted = getPredictedOutcome(prediction.final.probabilities);
  const baselinePredicted = getPredictedOutcome(prediction.baseline.probabilities);
  const predHome = prediction.final.scoreline.home;
  const predAway = prediction.final.scoreline.away;
  const scorelineDistance =
    Math.abs(predHome - result.homeScore) + Math.abs(predAway - result.awayScore);
  const predictedMargin = predHome - predAway;
  const actualMargin = result.homeScore - result.awayScore;

  return {
    matchId: prediction.matchId,
    outcomeCorrect: predicted === actual,
    baselineOutcomeCorrect: baselinePredicted === actual,
    exactScore: predHome === result.homeScore && predAway === result.awayScore,
    scorelineDistance,
    correctGoalDiff: predictedMargin === actualMargin,
    closeScore: scorelineDistance <= 1,
    brierScore: brierScore(prediction.final.probabilities, actual),
    baselineBrierScore: brierScore(prediction.baseline.probabilities, actual),
    predictedOutcome: predicted,
    baselinePredictedOutcome: baselinePredicted,
    actualOutcome: actual,
  };
}

export function computeStats(gradings: MatchGrading[]): AccuracyStats {
  const total = gradings.length;
  if (total === 0) {
    return {
      updatedAt: new Date().toISOString(),
      totalMatches: 0,
      outcomeAccuracy: 0,
      exactScoreRate: 0,
      closeScoreRate: 0,
      correctGoalDiffRate: 0,
      avgBrierScore: 0,
      baselineOutcomeAccuracy: 0,
      baselineAvgBrierScore: 0,
      gradings: [],
    };
  }

  const outcomeCorrect = gradings.filter((g) => g.outcomeCorrect).length;
  const baselineCorrect = gradings.filter((g) => g.baselineOutcomeCorrect).length;
  const exactScores = gradings.filter((g) => g.exactScore).length;
  const closeScores = gradings.filter((g) => g.closeScore).length;
  const correctGoalDiffs = gradings.filter((g) => g.correctGoalDiff).length;
  const avgBrier = gradings.reduce((s, g) => s + g.brierScore, 0) / total;
  const avgBaselineBrier =
    gradings.reduce((s, g) => s + g.baselineBrierScore, 0) / total;

  return {
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
  };
}
