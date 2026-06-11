import { getStore } from "@netlify/blobs";
import type {
  AccuracyStats,
  AppData,
  Fixture,
  LockedPrediction,
  MatchResult,
} from "../types.js";

const STORE_NAME = "world-cup-predictor";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

/** In-memory fallback for local dev without Netlify Blobs */
const memoryStore = new Map<string, string>();

async function get(key: string): Promise<string | null> {
  try {
    const s = store();
    return await s.get(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

async function set(key: string, value: string): Promise<void> {
  try {
    const s = store();
    await s.set(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

export async function getFixtures(): Promise<Fixture[]> {
  const raw = await get("fixtures");
  if (!raw) return [];
  return JSON.parse(raw) as Fixture[];
}

export async function setFixtures(fixtures: Fixture[]): Promise<void> {
  await set("fixtures", JSON.stringify(fixtures));
}

export async function getPrediction(matchId: number): Promise<LockedPrediction | null> {
  const raw = await get(`predictions/${matchId}`);
  if (!raw) return null;
  return JSON.parse(raw) as LockedPrediction;
}

export async function setPrediction(prediction: LockedPrediction): Promise<void> {
  await set(`predictions/${prediction.matchId}`, JSON.stringify(prediction));
}

export async function getAllPredictions(): Promise<Record<string, LockedPrediction>> {
  const fixtures = await getFixtures();
  const predictions: Record<string, LockedPrediction> = {};
  for (const f of fixtures) {
    const p = await getPrediction(f.id);
    if (p) predictions[String(f.id)] = p;
  }
  return predictions;
}

export async function getResult(matchId: number): Promise<MatchResult | null> {
  const raw = await get(`results/${matchId}`);
  if (!raw) return null;
  return JSON.parse(raw) as MatchResult;
}

export async function setResult(result: MatchResult): Promise<void> {
  await set(`results/${result.matchId}`, JSON.stringify(result));
}

export async function getAllResults(): Promise<Record<string, MatchResult>> {
  const fixtures = await getFixtures();
  const results: Record<string, MatchResult> = {};
  for (const f of fixtures) {
    const r = await getResult(f.id);
    if (r) results[String(f.id)] = r;
  }
  return results;
}

export async function getStats(): Promise<AccuracyStats | null> {
  const raw = await get("stats");
  if (!raw) return null;
  return JSON.parse(raw) as AccuracyStats;
}

export async function setStats(stats: AccuracyStats): Promise<void> {
  await set("stats", JSON.stringify(stats));
}

export async function loadAppData(): Promise<AppData> {
  const [fixtures, predictions, results, stats] = await Promise.all([
    getFixtures(),
    getAllPredictions(),
    getAllResults(),
    getStats(),
  ]);
  return {
    fixtures,
    predictions,
    results,
    stats,
    lastRefreshed: new Date().toISOString(),
  };
}
