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

export function hasStripeSecretKey(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}
