import type { Env, Beat, DOResult } from "./types";

/** Singleton DO stub ID — single instance manages all news data */
const DO_ID_NAME = "news-singleton";

/** Get a stub for the news DO */
function getStub(env: Env): DurableObjectStub {
  const id = env.NEWS_DO.idFromName(DO_ID_NAME);
  return env.NEWS_DO.get(id);
}

/** Type-safe fetch helper */
async function doFetch<T>(
  stub: DurableObjectStub,
  path: string,
  init?: RequestInit
): Promise<DOResult<T>> {
  const res = await stub.fetch(`https://do${path}`, init);
  return (await res.json()) as DOResult<T>;
}

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

export async function listBeats(env: Env): Promise<Beat[]> {
  const stub = getStub(env);
  const result = await doFetch<Beat[]>(stub, "/beats");
  return result.data ?? [];
}

export async function getBeat(env: Env, slug: string): Promise<Beat | null> {
  const stub = getStub(env);
  const result = await doFetch<Beat>(
    stub,
    `/beats/${encodeURIComponent(slug)}`
  );
  return result.ok ? (result.data ?? null) : null;
}

export async function createBeat(
  env: Env,
  beat: Omit<Beat, "created_at" | "updated_at">
): Promise<DOResult<Beat>> {
  const stub = getStub(env);
  return doFetch<Beat>(stub, "/beats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(beat),
  });
}

export async function updateBeat(
  env: Env,
  slug: string,
  updates: Partial<Beat>
): Promise<DOResult<Beat>> {
  const stub = getStub(env);
  return doFetch<Beat>(stub, `/beats/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}
