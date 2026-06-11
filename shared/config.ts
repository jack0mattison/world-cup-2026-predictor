export function hasFootballDataApiKey(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY?.trim());
}

export function hasBraveSearchApiKey(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
}

export function hasOpenRouterApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "anthropic/claude-sonnet-4";
}

export function isLlmLayerEnabled(): boolean {
  return hasBraveSearchApiKey() && hasOpenRouterApiKey();
}
