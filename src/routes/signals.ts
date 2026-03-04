import { Hono } from "hono";
import type { Env, AppVariables } from "../lib/types";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { SIGNAL_RATE_LIMIT } from "../lib/constants";
import {
  validateBtcAddress,
  validateSlug,
  validateHeadline,
  validateSources,
  validateTags,
  validateSignatureFormat,
  sanitizeString,
} from "../lib/validators";
import {
  listSignals,
  getSignal,
  createSignal,
  correctSignal,
} from "../lib/do-client";

const signalsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const signalRateLimit = createRateLimitMiddleware({
  key: "signals",
  maxRequests: SIGNAL_RATE_LIMIT.maxRequests,
  windowSeconds: SIGNAL_RATE_LIMIT.windowSeconds,
});

// GET /api/signals — list signals with optional filters
signalsRouter.get("/api/signals", async (c) => {
  const beat = c.req.query("beat");
  const agent = c.req.query("agent");
  const tag = c.req.query("tag");
  const since = c.req.query("since");
  const limitParam = c.req.query("limit");
  const limit = limitParam
    ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200)
    : undefined;

  const signals = await listSignals(c.env, {
    beat,
    agent,
    tag,
    since,
    limit,
  });
  return c.json(signals);
});

// GET /api/signals/:id — get a single signal
signalsRouter.get("/api/signals/:id", async (c) => {
  const id = c.req.param("id");
  const signal = await getSignal(c.env, id);
  if (!signal) {
    return c.json({ error: `Signal "${id}" not found` }, 404);
  }
  return c.json(signal);
});

// POST /api/signals — submit a new signal (rate limited)
signalsRouter.post("/api/signals", signalRateLimit, async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { beat_slug, btc_address, headline, body: signalBody, sources, tags, signature } = body;

  // Required fields
  if (!beat_slug || !btc_address || !headline || !sources || !tags) {
    return c.json(
      {
        error: "Missing required fields: beat_slug, btc_address, headline, sources, tags",
      },
      400
    );
  }

  if (!validateSlug(beat_slug)) {
    return c.json({ error: "Invalid beat_slug (a-z0-9 + hyphens, 3-50 chars)" }, 400);
  }

  if (!validateBtcAddress(btc_address)) {
    return c.json(
      { error: "Invalid BTC address format (expected bech32 bc1...)" },
      400
    );
  }

  if (!validateHeadline(headline)) {
    return c.json({ error: "Invalid headline (string, 1-120 chars)" }, 400);
  }

  if (!validateSources(sources)) {
    return c.json(
      { error: "Invalid sources (array of {url, title}, 1-5 items)" },
      400
    );
  }

  if (!validateTags(tags)) {
    return c.json(
      { error: "Invalid tags (array of lowercase slugs, 1-10 items, 2-30 chars each)" },
      400
    );
  }

  // Optional: signature (validated format only, verification deferred to Phase 6)
  if (signature !== undefined && !validateSignatureFormat(signature)) {
    return c.json(
      { error: "Invalid signature format (expected base64, 20-200 chars)" },
      401
    );
  }

  const result = await createSignal(c.env, {
    beat_slug: beat_slug as string,
    btc_address: btc_address as string,
    headline: headline as string,
    body: signalBody ? sanitizeString(signalBody, 1000) : null,
    sources,
    tags,
    signature: signature as string | undefined,
  });

  if (!result.ok) {
    const status = result.error?.includes("not found") ? 404 : 400;
    return c.json({ error: result.error }, status);
  }

  return c.json(result.data, 201);
});

// PATCH /api/signals/:id — correct a signal (original author only)
signalsRouter.patch("/api/signals/:id", async (c) => {
  const id = c.req.param("id");

  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { btc_address, headline, body: signalBody, sources, tags, signature } = body;

  if (!btc_address) {
    return c.json({ error: "Missing required field: btc_address" }, 400);
  }

  if (!validateBtcAddress(btc_address)) {
    return c.json(
      { error: "Invalid BTC address format (expected bech32 bc1...)" },
      400
    );
  }

  // Validate optional fields if provided
  if (headline !== undefined && !validateHeadline(headline)) {
    return c.json({ error: "Invalid headline (string, 1-120 chars)" }, 400);
  }

  if (sources !== undefined && !validateSources(sources)) {
    return c.json(
      { error: "Invalid sources (array of {url, title}, 1-5 items)" },
      400
    );
  }

  if (tags !== undefined && !validateTags(tags)) {
    return c.json(
      { error: "Invalid tags (array of lowercase slugs, 1-10 items, 2-30 chars each)" },
      400
    );
  }

  if (signature !== undefined && !validateSignatureFormat(signature)) {
    return c.json(
      { error: "Invalid signature format (expected base64, 20-200 chars)" },
      401
    );
  }

  const result = await correctSignal(c.env, id, {
    btc_address: btc_address as string,
    headline: headline as string | undefined,
    body: signalBody ? sanitizeString(signalBody, 1000) : null,
    sources: sources as import("../lib/types").Source[] | undefined,
    tags: tags as string[] | undefined,
    signature: signature as string | undefined,
  });

  if (!result.ok) {
    const status = result.error?.includes("not found")
      ? 404
      : result.error?.includes("Only the original author")
      ? 403
      : 400;
    return c.json({ error: result.error }, status);
  }

  return c.json(result.data);
});

// OPTIONS — CORS preflight
signalsRouter.options("/api/signals", (c) => new Response(null, { status: 204 }));
signalsRouter.options("/api/signals/:id", (c) => new Response(null, { status: 204 }));

export { signalsRouter };
