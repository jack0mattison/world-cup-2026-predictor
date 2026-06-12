/**
 * Asserts prediction window logic — run: npm run verify:schedule
 */
import type { Fixture } from "../shared/types.js";
import {
  findMissedFinalizations,
  fixturesNeedingEarly,
  fixturesNeedingFinal,
} from "../shared/prediction/schedule.js";

function fixture(
  id: number,
  hoursUntil: number,
  status: Fixture["status"] = "SCHEDULED",
  at = now
): Fixture {
  const utcDate = new Date(at + hoursUntil * 60 * 60 * 1000).toISOString();
  return {
    id,
    utcDate,
    status,
    matchday: 1,
    stage: "GROUP_STAGE",
    group: "A",
    knockout: false,
    homeTeam: { id: 1, name: "Home", shortName: "Home", tla: "HOM" },
    awayTeam: { id: 2, name: "Away", shortName: "Away", tla: "AWY" },
  };
}

const now = Date.now();
const failures: string[] = [];

function assert(name: string, condition: boolean): void {
  if (!condition) failures.push(name);
}

const phase = (id: number): "early" | "final" | null => {
  if (id === 100) return "early";
  if (id === 101) return "final";
  return null;
};

assert(
  "10h before → early due",
  fixturesNeedingEarly([fixture(1, 10)], now, phase).length === 1
);
assert(
  "4h before → not early (final window)",
  fixturesNeedingEarly([fixture(2, 4)], now, phase).length === 0
);
assert(
  "4h before → final due",
  fixturesNeedingFinal([fixture(3, 4)], now, phase).length === 1
);
assert(
  "5h before → early only",
  fixturesNeedingEarly([fixture(4, 5)], now, phase).length === 1 &&
    fixturesNeedingFinal([fixture(4, 5)], now, phase).length === 0
);
assert(
  "3h before with early → final due",
  fixturesNeedingFinal([fixture(100, 3)], now, phase).length === 1
);
assert(
  "already final → skip",
  fixturesNeedingFinal([fixture(101, 3)], now, phase).length === 0
);
assert(
  "FINISHED → not final due",
  fixturesNeedingFinal([fixture(5, -1, "FINISHED")], now, phase).length === 0
);
assert(
  "1h after KO still SCHEDULED → final grace",
  fixturesNeedingFinal([fixture(6, -1, "SCHEDULED")], now, phase).length === 1
);
assert(
  "3h after KO → grace expired",
  fixturesNeedingFinal([fixture(7, -3, "SCHEDULED")], now, phase).length === 0
);
assert(
  "FINISHED with early only → missed",
  findMissedFinalizations([fixture(100, -2, "FINISHED")], now, phase).length ===
    1
);
assert(
  "FINISHED with final → not missed",
  findMissedFinalizations([fixture(101, -2, "FINISHED")], now, phase).length ===
    0
);

if (failures.length > 0) {
  console.error("Schedule verification FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Schedule verification passed (11 checks).");
