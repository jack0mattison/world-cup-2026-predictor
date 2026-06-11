export function hasFootballDataApiKey(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY?.trim());
}
