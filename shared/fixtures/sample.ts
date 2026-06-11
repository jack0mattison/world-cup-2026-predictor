import type { Fixture } from "../types.js";

/** Fallback fixtures for local dev / API outage — opening group-stage matches */
export function getSampleFixtures(): Fixture[] {
  const teams = {
    mex: { id: 1, name: "Mexico", shortName: "Mexico", tla: "MEX" },
    rsa: { id: 2, name: "South Africa", shortName: "South Africa", tla: "RSA" },
    kor: { id: 3, name: "South Korea", shortName: "South Korea", tla: "KOR" },
    den: { id: 4, name: "Denmark", shortName: "Denmark", tla: "DEN" },
    can: { id: 5, name: "Canada", shortName: "Canada", tla: "CAN" },
    sui: { id: 6, name: "Switzerland", shortName: "Switzerland", tla: "SUI" },
    qat: { id: 7, name: "Qatar", shortName: "Qatar", tla: "QAT" },
    eng: { id: 8, name: "England", shortName: "England", tla: "ENG" },
    cro: { id: 9, name: "Croatia", shortName: "Croatia", tla: "CRO" },
    bra: { id: 10, name: "Brazil", shortName: "Brazil", tla: "BRA" },
    mar: { id: 11, name: "Morocco", shortName: "Morocco", tla: "MAR" },
    hait: { id: 12, name: "Haiti", shortName: "Haiti", tla: "HAI" },
    usa: { id: 13, name: "United States", shortName: "USA", tla: "USA" },
    par: { id: 14, name: "Paraguay", shortName: "Paraguay", tla: "PAR" },
    aus: { id: 15, name: "Australia", shortName: "Australia", tla: "AUS" },
    ger: { id: 16, name: "Germany", shortName: "Germany", tla: "GER" },
    cur: { id: 17, name: "Curaçao", shortName: "Curaçao", tla: "CUW" },
    ned: { id: 18, name: "Netherlands", shortName: "Netherlands", tla: "NED" },
    jap: { id: 19, name: "Japan", shortName: "Japan", tla: "JPN" },
    tun: { id: 20, name: "Tunisia", shortName: "Tunisia", tla: "TUN" },
    bel: { id: 21, name: "Belgium", shortName: "Belgium", tla: "BEL" },
    egy: { id: 22, name: "Egypt", shortName: "Egypt", tla: "EGY" },
    irn: { id: 23, name: "Iran", shortName: "Iran", tla: "IRN" },
    nzl: { id: 24, name: "New Zealand", shortName: "New Zealand", tla: "NZL" },
    esp: { id: 25, name: "Spain", shortName: "Spain", tla: "ESP" },
    cab: { id: 26, name: "Cabo Verde", shortName: "Cabo Verde", tla: "CPV" },
    ksa: { id: 27, name: "Saudi Arabia", shortName: "Saudi Arabia", tla: "KSA" },
    uru: { id: 28, name: "Uruguay", shortName: "Uruguay", tla: "URU" },
    fra: { id: 29, name: "France", shortName: "France", tla: "FRA" },
    sen: { id: 30, name: "Senegal", shortName: "Senegal", tla: "SEN" },
    nor: { id: 31, name: "Norway", shortName: "Norway", tla: "NOR" },
    arg: { id: 32, name: "Argentina", shortName: "Argentina", tla: "ARG" },
    alg: { id: 33, name: "Algeria", shortName: "Algeria", tla: "ALG" },
    aut: { id: 34, name: "Austria", shortName: "Austria", tla: "AUT" },
    jor: { id: 35, name: "Jordan", shortName: "Jordan", tla: "JOR" },
    por: { id: 36, name: "Portugal", shortName: "Portugal", tla: "POR" },
    uzb: { id: 37, name: "Uzbekistan", shortName: "Uzbekistan", tla: "UZB" },
    col: { id: 38, name: "Colombia", shortName: "Colombia", tla: "COL" },
  };

  const now = new Date();
  const base = new Date(now);
  base.setUTCHours(19, 0, 0, 0);
  if (base.getTime() < now.getTime()) base.setUTCDate(base.getUTCDate() + 1);

  const slots = [
    { h: teams.mex, a: teams.rsa, group: "A", venue: "Estadio Azteca, Mexico City" },
    { h: teams.kor, a: teams.den, group: "C", venue: "Estadio Akron, Guadalajara" },
    { h: teams.can, a: teams.sui, group: "B", venue: "BMO Field, Toronto" },
    { h: teams.qat, a: teams.eng, group: "C", venue: "Levi's Stadium, Santa Clara" },
    { h: teams.cro, a: teams.bra, group: "D", venue: "MetLife Stadium, East Rutherford" },
    { h: teams.mar, a: teams.hait, group: "C", venue: "SoFi Stadium, Inglewood" },
    { h: teams.usa, a: teams.par, group: "D", venue: "SoFi Stadium, Inglewood" },
    { h: teams.aus, a: teams.ger, group: "D", venue: "BC Place, Vancouver" },
    { h: teams.cur, a: teams.ned, group: "F", venue: "Lincoln Financial Field, Philadelphia" },
    { h: teams.jap, a: teams.tun, group: "E", venue: "AT&T Stadium, Arlington" },
    { h: teams.bel, a: teams.egy, group: "F", venue: "Lumen Field, Seattle" },
    { h: teams.irn, a: teams.nzl, group: "G", venue: "SoFi Stadium, Inglewood" },
    { h: teams.esp, a: teams.cab, group: "H", venue: "Mercedes-Benz Stadium, Atlanta" },
    { h: teams.ksa, a: teams.uru, group: "H", venue: "Hard Rock Stadium, Miami" },
    { h: teams.fra, a: teams.sen, group: "I", venue: "MetLife Stadium, East Rutherford" },
    { h: teams.nor, a: teams.arg, group: "J", venue: "Gillette Stadium, Foxborough" },
    { h: teams.alg, a: teams.aut, group: "J", venue: "NRG Stadium, Houston" },
    { h: teams.jor, a: teams.por, group: "K", venue: "AT&T Stadium, Arlington" },
    { h: teams.uzb, a: teams.col, group: "K", venue: "Estadio Azteca, Mexico City" },
  ];

  return slots.map((s, i) => {
    const kickoff = new Date(base.getTime() + i * 3 * 60 * 60 * 1000);
    const isPast = kickoff.getTime() < now.getTime() - 2 * 60 * 60 * 1000;
    return {
      id: 1000 + i,
      utcDate: kickoff.toISOString(),
      status: isPast ? "FINISHED" : "SCHEDULED",
      stage: "GROUP_STAGE" as const,
      group: s.group,
      homeTeam: s.h,
      awayTeam: s.a,
      venue: s.venue,
      matchday: 1,
      knockout: false,
      score: isPast
          ? {
              home: i % 3 === 0 ? 2 : 1,
              away: i % 3 === 0 ? 1 : i % 3 === 1 ? 1 : 0,
              winner: (i % 3 === 2 ? "DRAW" : "HOME") as "HOME" | "DRAW",
            }
          : undefined,
    };
  });
}
