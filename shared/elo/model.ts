import type { BaselinePrediction, Fixture, PredictionProbabilities } from "../types.js";
import { getTeamElo } from "./ratings.js";

const HOME_ADVANTAGE = 65;
const GROUP_DRAW_RATE = 0.24;
const KNOCKOUT_DRAW_THRESHOLD = 0.28;
const ELO_SCALE = 400;

/** Standard Elo win expectancy for home team */
function eloExpectancy(homeElo: number, awayElo: number): number {
  return 1 / (1 + Math.pow(10, (awayElo - homeElo) / ELO_SCALE));
}

/**
 * Davidson-style draw model: allocate draw probability from Elo closeness,
 * tuned to historical WC group-stage draw rate (~24%).
 */
function computeDrawProbability(
  homeWinProb: number,
  knockout: boolean
): number {
  if (knockout) {
    const closeness = 1 - Math.abs(homeWinProb - 0.5) * 2;
    return Math.max(0.08, closeness * 0.18);
  }
  const closeness = 1 - Math.abs(homeWinProb - 0.5) * 2;
  return GROUP_DRAW_RATE * (0.6 + 0.4 * closeness);
}

function redistributeForKnockout(probs: PredictionProbabilities): PredictionProbabilities {
  const { home, draw, away } = probs;
  const factor = 1 / (1 - draw / 100);
  return {
    home: Math.round(home * factor * 10) / 10,
    draw: 0,
    away: Math.round(away * factor * 10) / 10,
  };
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

/** Poisson expected goals from Elo gap and tournament scoring rates */
function expectedGoals(homeElo: number, awayElo: number, isHome: boolean): number {
  const baseRate = 1.35;
  const eloDiff = isHome ? homeElo - awayElo + HOME_ADVANTAGE : awayElo - homeElo - HOME_ADVANTAGE;
  const multiplier = Math.pow(10, eloDiff / (ELO_SCALE * 2));
  return Math.max(0.4, Math.min(3.5, baseRate * multiplier));
}

function poissonScoreline(homeXg: number, awayXg: number): { home: number; away: number } {
  const maxGoals = 5;
  let bestHome = 0;
  let bestAway = 0;
  let bestProb = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poisson(h, homeXg) * poisson(a, awayXg);
      if (prob > bestProb) {
        bestProb = prob;
        bestHome = h;
        bestAway = a;
      }
    }
  }
  return { home: bestHome, away: bestAway };
}

function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

export function computeBaseline(fixture: Fixture): BaselinePrediction {
  const homeElo = getTeamElo(fixture.homeTeam.name);
  const awayElo = getTeamElo(fixture.awayTeam.name);
  const adjustedHomeElo = homeElo + HOME_ADVANTAGE;

  const homeWinRaw = eloExpectancy(adjustedHomeElo, awayElo);
  const drawRaw = computeDrawProbability(homeWinRaw, fixture.knockout);
  const awayWinRaw = 1 - homeWinRaw - drawRaw;

  let probs: PredictionProbabilities = {
    home: homeWinRaw * 100,
    draw: drawRaw * 100,
    away: awayWinRaw * 100,
  };

  const extraTimeLikely = fixture.knockout && probs.draw > KNOCKOUT_DRAW_THRESHOLD * 100;

  if (fixture.knockout) {
    probs = redistributeForKnockout(probs);
  } else {
    probs = normalise(probs);
  }

  const homeXg = expectedGoals(homeElo, awayElo, true);
  const awayXg = expectedGoals(homeElo, awayElo, false);
  const scoreline = poissonScoreline(homeXg, awayXg);

  return {
    probabilities: probs,
    scoreline,
    homeElo,
    awayElo,
    extraTimeLikely,
  };
}
