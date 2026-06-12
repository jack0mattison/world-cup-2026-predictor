import type { Fixture, LockedPrediction } from "../shared/types.js";

export const UK_TIMEZONE = "Europe/London";

const ukDateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: UK_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

const ukShortDateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: UK_TIMEZONE,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

export function formatKickoff(utcDate: string): { local: string; venue?: string } {
  const local = new Date(utcDate).toLocaleString("en-GB", ukDateTimeOptions);
  return { local };
}

export function formatUkDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-GB", ukShortDateTimeOptions);
}

export function timeUntilKickoff(utcDate: string): string {
  const diff = new Date(utcDate).getTime() - Date.now();
  if (diff <= 0) return "Started";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 48) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function isLocked(fixture: Fixture, prediction?: LockedPrediction): boolean {
  if (!prediction) return false;
  return new Date(fixture.utcDate).getTime() <= Date.now();
}

export function getPredictedWinner(pred: LockedPrediction, fixture: Fixture): string {
  const { home, draw, away } = pred.final.probabilities;
  if (home >= draw && home >= away) return fixture.homeTeam.tla;
  if (away >= draw && away >= home) return fixture.awayTeam.tla;
  return "Draw";
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
