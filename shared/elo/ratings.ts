/** World Football Elo ratings — June 2026 snapshot for WC participants */
const ELO_RATINGS: Record<string, number> = {
  Argentina: 2018,
  France: 1995,
  Spain: 1988,
  England: 1975,
  Brazil: 1970,
  Portugal: 1955,
  Netherlands: 1948,
  Belgium: 1935,
  Germany: 1928,
  Colombia: 1915,
  Italy: 1910,
  Uruguay: 1905,
  Croatia: 1898,
  Morocco: 1885,
  Switzerland: 1878,
  USA: 1870,
  Mexico: 1865,
  Japan: 1860,
  Senegal: 1855,
  Denmark: 1850,
  Austria: 1845,
  Norway: 1840,
  "South Korea": 1835,
  Australia: 1830,
  Ecuador: 1825,
  Iran: 1820,
  Canada: 1815,
  Ukraine: 1810,
  Poland: 1805,
  Serbia: 1800,
  Scotland: 1795,
  Turkey: 1790,
  Algeria: 1785,
  Egypt: 1780,
  Tunisia: 1775,
  Paraguay: 1770,
  "Costa Rica": 1765,
  "Saudi Arabia": 1760,
  Qatar: 1755,
  Jordan: 1750,
  Uzbekistan: 1745,
  "New Zealand": 1740,
  "South Africa": 1735,
  Haiti: 1725,
  "Cabo Verde": 1720,
  Curaçao: 1715,
  Panama: 1710,
  Ghana: 1705,
  Cameroon: 1700,
  Nigeria: 1695,
  "Ivory Coast": 1690,
};

const NAME_ALIASES: Record<string, string> = {
  "United States": "USA",
  USA: "USA",
  "Korea Republic": "South Korea",
  "Korea, Republic of": "South Korea",
  "Republic of Korea": "South Korea",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Cape Verde": "Cabo Verde",
  "Cape Verde Islands": "Cabo Verde",
  "Curacao": "Curaçao",
  "IR Iran": "Iran",
  "KSA": "Saudi Arabia",
};

const DEFAULT_ELO = 1700;

export function getTeamElo(teamName: string): number {
  const alias = NAME_ALIASES[teamName];
  const key = alias ?? teamName;
  return ELO_RATINGS[key] ?? DEFAULT_ELO;
}

export function getAllRatings(): Record<string, number> {
  return { ...ELO_RATINGS };
}
