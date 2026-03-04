import { Hono } from "hono";
import type { Env, AppVariables } from "../lib/types";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { BEAT_RATE_LIMIT } from "../lib/constants";
import { validateSlug, validateHexColor, validateBtcAddress, sanitizeString } from "../lib/validators";
import { listBeats, getBeat, createBeat, updateBeat } from "../lib/do-client";

const beatsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const beatRateLimit = createRateLimitMiddleware({
  key: "beats",
  maxRequests: BEAT_RATE_LIMIT.maxRequests,
  windowSeconds: BEAT_RATE_LIMIT.windowSeconds,
});

// GET /api/beats — list all beats
beatsRouter.get("/api/beats", async (c) => {
  const beats = await listBeats(c.env);
  return c.json(beats);
});

// GET /api/beats/:slug — get a single beat by slug
beatsRouter.get("/api/beats/:slug", async (c) => {
  const slug = c.req.param("slug");
  const beat = await getBeat(c.env, slug);
  if (!beat) {
    return c.json({ error: `Beat "${slug}" not found` }, 404);
  }
  return c.json(beat);
});

// POST /api/beats — create a new beat (rate limited)
beatsRouter.post("/api/beats", beatRateLimit, async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { slug, name, description, color, created_by } = body;

  if (!slug || !name || !created_by) {
    return c.json(
      { error: "Missing required fields: slug, name, created_by" },
      400
    );
  }

  if (!validateSlug(slug)) {
    return c.json(
      { error: "Invalid slug (a-z0-9 + hyphens, 3-50 chars)" },
      400
    );
  }

  if (!validateBtcAddress(created_by)) {
    return c.json(
      { error: "Invalid BTC address format (expected bech32 bc1...)" },
      400
    );
  }

  if (color !== undefined && color !== null && !validateHexColor(color)) {
    return c.json({ error: "Invalid color format (expected #RRGGBB)" }, 400);
  }

  const result = await createBeat(c.env, {
    slug: slug as string,
    name: sanitizeString(name, 100),
    description: description ? sanitizeString(description, 500) : null,
    color: color ? (color as string) : null,
    created_by: created_by as string,
  });

  if (!result.ok) {
    const status = result.error?.includes("already exists") ? 409 : 400;
    return c.json({ error: result.error }, status);
  }

  return c.json(result.data, 201);
});

// PATCH /api/beats/:slug — update a beat (rate limited)
beatsRouter.patch("/api/beats/:slug", beatRateLimit, async (c) => {
  const slug = c.req.param("slug");

  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (body.color !== undefined && body.color !== null && !validateHexColor(body.color)) {
    return c.json({ error: "Invalid color format (expected #RRGGBB)" }, 400);
  }

  const result = await updateBeat(c.env, slug, body);

  if (!result.ok) {
    const status = result.error?.includes("not found") ? 404 : 400;
    return c.json({ error: result.error }, status);
  }

  return c.json(result.data);
});

// OPTIONS — CORS preflight
beatsRouter.options("/api/beats", (c) => new Response(null, { status: 204 }));
beatsRouter.options("/api/beats/:slug", (c) => new Response(null, { status: 204 }));

export { beatsRouter };
