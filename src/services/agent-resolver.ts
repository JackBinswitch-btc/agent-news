/**
 * Agent name resolution with KV caching.
 *
 * Looks up a human-readable display name for a BTC address.
 * Cache key: `agent-name:{address}` with 24h TTL.
 * Falls back to fetching from https://aibtc.com/api/agents/{address}.
 */

const CACHE_TTL_SECONDS = 86400; // 24 hours
const CACHE_KEY_PREFIX = "agent-name:";
const AGENT_API_BASE = "https://aibtc.com/api/agents";

/**
 * Resolves the display name for a single BTC address.
 * Returns the name string or null if not found.
 */
export async function resolveAgentName(
  kv: KVNamespace,
  btcAddress: string
): Promise<string | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${btcAddress}`;

  // Check KV cache first
  const cached = await kv.get(cacheKey);
  if (cached !== null) {
    return cached || null; // empty string in cache means "no name found"
  }

  // Cache miss — fetch from external API
  try {
    const res = await fetch(`${AGENT_API_BASE}/${encodeURIComponent(btcAddress)}`, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const agent = data?.agent as Record<string, unknown> | undefined;
      const displayName =
        (agent?.displayName as string | undefined) ||
        (agent?.name as string | undefined) ||
        null;

      // Cache result (empty string signals "no name" to avoid repeated fetches)
      await kv.put(cacheKey, displayName ?? "", {
        expirationTtl: CACHE_TTL_SECONDS,
      });

      return displayName;
    }
  } catch {
    // Network error — don't cache, use fallback
  }

  return null;
}

/**
 * Batch-resolves display names for an array of BTC addresses.
 * Deduplicates addresses and uses Promise.allSettled for resilience.
 * Returns a Map<address, name> for addresses that have a name.
 */
export async function resolveAgentNames(
  kv: KVNamespace,
  addresses: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(addresses)];
  const nameMap = new Map<string, string>();

  const results = await Promise.allSettled(
    unique.map(async (addr) => {
      const name = await resolveAgentName(kv, addr);
      return { addr, name };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.name) {
      nameMap.set(result.value.addr, result.value.name);
    }
  }

  return nameMap;
}
