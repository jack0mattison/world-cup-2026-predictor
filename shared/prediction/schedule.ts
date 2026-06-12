import type { Fixture, PredictionPhase } from "../types.js";

/** Final prediction — full LLM + Brave (ideal: 2–4h before, enforced by cron density) */
export const FINAL_MAX_HOURS = 4;
/** Grace after kickoff while API may still show SCHEDULED/LIVE */
export const FINAL_AFTER_KICKOFF_HOURS = 2;

/** Early estimate — Elo baseline only */
export const EARLY_MIN_HOURS = 4;
export const EARLY_MAX_HOURS = 12;

const HOUR_MS = 60 * 60 * 1000;

function msUntilKickoff(fixture: Fixture, now: number): number {
  return new Date(fixture.utcDate).getTime() - now;
}

export function hoursUntilKickoff(fixture: Fixture, now = Date.now()): number {
  return msUntilKickoff(fixture, now) / HOUR_MS;
}

function isPlayableStatus(status: Fixture["status"]): boolean {
  return status === "SCHEDULED" || status === "LIVE";
}

function isTerminalStatus(status: Fixture["status"]): boolean {
  return status === "FINISHED" || status === "CANCELLED" || status === "POSTPONED";
}

/**
 * Early pass: strictly between 4h and 12h before kick-off (4h itself goes to final).
 */
export function fixturesNeedingEarly(
  fixtures: Fixture[],
  now = Date.now(),
  getPhase: (id: number) => PredictionPhase | null = () => null
): Fixture[] {
  const minMs = EARLY_MIN_HOURS * HOUR_MS;
  const maxMs = EARLY_MAX_HOURS * HOUR_MS;

  return fixtures.filter((fixture) => {
    if (!isPlayableStatus(fixture.status)) return false;
    if (getPhase(fixture.id)) return false;

    const timeUntil = msUntilKickoff(fixture, now);
    return timeUntil > minMs && timeUntil <= maxMs;
  });
}

/**
 * Final pass: from 4h before kick-off until kick-off (+ short grace if status lags).
 * Upgrades early → final; also covers 0–2h catch-up if cron runs were missed.
 */
export function fixturesNeedingFinal(
  fixtures: Fixture[],
  now = Date.now(),
  getPhase: (id: number) => PredictionPhase | null = () => null
): Fixture[] {
  const maxMs = FINAL_MAX_HOURS * HOUR_MS;
  const graceAfterKoMs = FINAL_AFTER_KICKOFF_HOURS * HOUR_MS;

  return fixtures.filter((fixture) => {
    if (isTerminalStatus(fixture.status)) return false;
    if (!isPlayableStatus(fixture.status)) return false;
    if (getPhase(fixture.id) === "final") return false;

    const timeUntil = msUntilKickoff(fixture, now);

    if (timeUntil > maxMs) return false;

    if (timeUntil <= 0) {
      return timeUntil > -graceAfterKoMs;
    }

    return true;
  });
}

/** Finished matches that never received a final lock (pipeline miss). */
export function findMissedFinalizations(
  fixtures: Fixture[],
  now = Date.now(),
  getPhase: (id: number) => PredictionPhase | null = () => null
): Fixture[] {
  return fixtures.filter((fixture) => {
    if (fixture.status !== "FINISHED") return false;
    if (msUntilKickoff(fixture, now) > 0) return false;
    const phase = getPhase(fixture.id);
    return phase !== "final";
  });
}
