import { getStore } from "@netlify/blobs";
import type {
  AccuracyStats,
  AppData,
  DataMeta,
  Fixture,
  LockedPrediction,
  MatchResult,
} from "../types.js";
import type { PredictRunResult } from "../prediction/runner.js";
import { hasFootballDataApiKey } from "../config.js";
import { isSampleFixtures } from "../fixtures/sample.js";

const STORE_NAME = "world-cup-predictor";

function store() {
  return getStore({ name: STORE_NAME });
}

/** In-memory fallback only for offline local dev (never in deployed Netlify functions) */
const memoryStore = new Map<string, string>();

function allowMemoryFallback(): boolean {
  return !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME;
}

async function get(key: string): Promise<string | null> {
  try {
    return await store().get(key);
  } catch (err) {
    if (!allowMemoryFallback()) {
      console.error(`Blob get failed for ${key}:`, err);
      throw err;
    }
    return memoryStore.get(key) ?? null;
  }
}

async function set(key: string, value: string): Promise<void> {
  try {
    await store().set(key, value);
  } catch (err) {
    if (!allowMemoryFallback()) {
      console.error(`Blob set failed for ${key}:`, err);
      throw err;
    }
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

export async function getFixturesRefreshedAt(): Promise<string | null> {
  return get("fixtures/refreshedAt");
}

export async function setFixturesRefreshedAt(iso: string): Promise<void> {
  await set("fixtures/refreshedAt", iso);
}

interface IngestMetaBlob {
  fixtureSource?: DataMeta["fixtureSource"];
  lastIngestError?: string | null;
}

export async function getIngestMetaBlob(): Promise<IngestMetaBlob> {
  const raw = await get("fixtures/meta");
  if (!raw) return {};
  return JSON.parse(raw) as IngestMetaBlob;
}

export async function setIngestMeta(partial: IngestMetaBlob): Promise<void> {
  const current = await getIngestMetaBlob();
  await set("fixtures/meta", JSON.stringify({ ...current, ...partial }));
}

export async function buildDataMeta(fixtures: Fixture[]): Promise<DataMeta> {
  const blob = await getIngestMetaBlob();
  const sample = isSampleFixtures(fixtures);
  return {
    fixtureSource: blob.fixtureSource ?? (sample ? "sample" : "football-data.org"),
    apiKeyConfigured: hasFootballDataApiKey(),
    lastIngestError: blob.lastIngestError ?? null,
    fixtureCount: fixtures.length,
  };
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
  const predictions: Record<string, LockedPrediction> = {};

  try {
    const { blobs } = await store().list({ prefix: "predictions/" });
    for (const entry of blobs) {
      const raw = await get(entry.key);
      if (!raw) continue;
      const p = JSON.parse(raw) as LockedPrediction;
      predictions[String(p.matchId)] = p;
    }
    if (Object.keys(predictions).length > 0) return predictions;
  } catch (err) {
    console.warn("Blob list for predictions failed, falling back to fixture scan:", err);
  }

  const fixtures = await getFixtures();
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

interface PredictMetaBlob {
  lastRunAt?: string;
  lastResult?: PredictRunResult;
}

export async function getPredictRunMeta(): Promise<PredictMetaBlob> {
  const raw = await get("predict/meta");
  if (!raw) return {};
  return JSON.parse(raw) as PredictMetaBlob;
}

export async function setPredictRunMeta(partial: PredictMetaBlob): Promise<void> {
  const current = await getPredictRunMeta();
  await set("predict/meta", JSON.stringify({ ...current, ...partial }));
}

export async function loadAppData(): Promise<AppData> {
  const [fixtures, predictions, results, stats] = await Promise.all([
    getFixtures(),
    getAllPredictions(),
    getAllResults(),
    getStats(),
  ]);
  const meta = await buildDataMeta(fixtures);
  return {
    fixtures,
    predictions,
    results,
    stats,
    lastRefreshed: new Date().toISOString(),
    meta,
  };
}
