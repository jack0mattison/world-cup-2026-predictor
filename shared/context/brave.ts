const BRAVE_WEB_URL = "https://api.search.brave.com/res/v1/web/search";

export interface SearchSnippet {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveWebResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      age?: string;
    }>;
  };
}

export async function braveWebSearch(
  query: string,
  apiKey: string,
  count = 5
): Promise<SearchSnippet[]> {
  const url = new URL(BRAVE_WEB_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("freshness", "pw");
  url.searchParams.set("result_filter", "web,news");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brave Search ${res.status}: ${body}`);
  }

  const data = (await res.json()) as BraveWebResponse;
  return (data.web?.results ?? [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title!,
      url: r.url!,
      description: r.description ?? "",
      age: r.age,
    }));
}
