import type { AppData } from "../shared/types.js";
import { getDevSampleData } from "./sample-data.js";

const API_URL = "/api/data";

export async function fetchAppData(): Promise<AppData> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as AppData;
    if (data.fixtures?.length) return data;
    return getDevSampleData();
  } catch {
    return getDevSampleData();
  }
}
