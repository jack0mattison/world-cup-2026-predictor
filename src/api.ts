import type { AppData } from "../shared/types.js";
import { getDevSampleData } from "./sample-data.js";

const API_URL = "/api/data";

export async function fetchAppData(opts: { live?: boolean; force?: boolean } = {}): Promise<AppData> {
  try {
    const params = new URLSearchParams();
    if (opts.live) params.set("live", "1");
    if (opts.force) params.set("refresh", "1");
    const qs = params.toString();
    const url = qs ? `${API_URL}?${qs}` : API_URL;
    const res = await fetch(url, { cache: opts.force || opts.live ? "no-store" : "default" });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as AppData;
    if (data.fixtures?.length) return data;
    return getDevSampleData();
  } catch {
    return getDevSampleData();
  }
}
