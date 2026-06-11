import { connectLambda } from "@netlify/blobs";

interface LambdaBlobEvent {
  blobs?: string;
  headers?: Record<string, string | undefined>;
}

/** Required for Netlify Functions lambda compatibility mode */
export function connectBlobs(event: unknown): void {
  const e = event as LambdaBlobEvent;
  if (e?.blobs) {
    connectLambda(e as Parameters<typeof connectLambda>[0]);
  }
}
