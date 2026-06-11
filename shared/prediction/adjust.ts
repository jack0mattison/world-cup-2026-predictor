import type {
  Fixture,
  LockedPrediction,
  LlmAdjustment,
  PredictionProbabilities,
  PredictedScoreline,
} from "../types.js";

const MAX_SHIFT_PP = 10;

function clampShift(n: number): number {
  return Math.max(-MAX_SHIFT_PP, Math.min(MAX_SHIFT_PP, n));
}

function normalise(probs: PredictionProbabilities): PredictionProbabilities {
  const total = probs.home + probs.draw + probs.away;
  if (total === 0) return { home: 33.3, draw: 33.3, away: 33.3 };
  return {
    home: Math.round((probs.home / total) * 1000) / 10,
    draw: Math.round((probs.draw / total) * 1000) / 10,
    away: Math.round((probs.away / total) * 1000) / 10,
  };
}

function redistributeKnockout(probs: PredictionProbabilities): PredictionProbabilities {
  if (probs.draw <= 0) return probs;
  const factor = 1 / (1 - probs.draw / 100);
  return normalise({
    home: probs.home * factor,
    draw: 0,
    away: probs.away * factor,
  });
}

export function parseLlmAdjustment(raw: unknown): LlmAdjustment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const shift = o.probabilityShift as Record<string, unknown> | undefined;
  const scoreShift = o.scorelineShift as Record<string, unknown> | undefined;
  if (!shift || !scoreShift) return null;

  const probabilityShift: PredictionProbabilities = {
    home: clampShift(Number(shift.home) || 0),
    draw: clampShift(Number(shift.draw) || 0),
    away: clampShift(Number(shift.away) || 0),
  };

  const confidence = o.confidence;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") {
    return null;
  }

  const contextQuality = o.contextQuality;
  if (
    contextQuality !== "thin" &&
    contextQuality !== "moderate" &&
    contextQuality !== "rich"
  ) {
    return null;
  }

  const rationale = typeof o.rationale === "string" ? o.rationale.trim() : "";
  if (!rationale) return null;

  const sources = Array.isArray(o.sources)
    ? o.sources.filter((s): s is string => typeof s === "string").slice(0, 8)
    : [];

  return {
    probabilityShift,
    scorelineShift: {
      home: Math.max(-2, Math.min(2, Math.round(Number(scoreShift.home) || 0))),
      away: Math.max(-2, Math.min(2, Math.round(Number(scoreShift.away) || 0))),
    },
    confidence,
    rationale,
    sources,
    contextQuality,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

export function applyAdjustment(
  fixture: Fixture,
  baselinePred: LockedPrediction,
  adjustment: LlmAdjustment
): LockedPrediction {
  const base = baselinePred.baseline;
  let probs: PredictionProbabilities = {
    home: base.probabilities.home + adjustment.probabilityShift.home,
    draw: base.probabilities.draw + adjustment.probabilityShift.draw,
    away: base.probabilities.away + adjustment.probabilityShift.away,
  };

  probs = normalise({
    home: Math.max(1, probs.home),
    draw: Math.max(1, probs.draw),
    away: Math.max(1, probs.away),
  });

  if (fixture.knockout) {
    probs = redistributeKnockout(probs);
  }

  let scoreline: PredictedScoreline = {
    home: Math.max(0, base.scoreline.home + adjustment.scorelineShift.home),
    away: Math.max(0, base.scoreline.away + adjustment.scorelineShift.away),
  };
  scoreline = {
    home: Math.min(5, scoreline.home),
    away: Math.min(5, scoreline.away),
  };

  const isZeroShift =
    adjustment.probabilityShift.home === 0 &&
    adjustment.probabilityShift.draw === 0 &&
    adjustment.probabilityShift.away === 0;

  if (isZeroShift && adjustment.contextQuality === "thin") {
    return baselinePred;
  }

  return {
    ...baselinePred,
    adjustment,
    final: {
      probabilities: probs,
      scoreline,
      confidence: adjustment.confidence,
      rationale: adjustment.rationale,
    },
    source: "llm-adjusted",
  };
}
