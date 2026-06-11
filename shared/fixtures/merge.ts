import type { Fixture } from "../types.js";

/** Overlay fresher match data (status, score, minute) onto cached fixtures */
export function mergeFixtures(base: Fixture[], updates: Fixture[]): Fixture[] {
  if (updates.length === 0) return base;
  const byId = new Map(updates.map((f) => [f.id, f]));
  return base.map((f) => {
    const u = byId.get(f.id);
    if (!u) return f;
    return {
      ...f,
      status: u.status,
      score: u.score ?? f.score,
      minute: u.minute ?? f.minute,
      injuryTime: u.injuryTime ?? f.injuryTime,
    };
  });
}
