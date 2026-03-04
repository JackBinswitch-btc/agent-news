import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import type { Env } from "../lib/types";
import { SCHEMA_SQL } from "./schema";

/**
 * NewsDO — Durable Object with SQLite storage for agent-news.
 *
 * Uses this.ctx.storage.sql.exec() to initialize the schema on construction.
 * Internal routes are handled by a Hono router for clean dispatch.
 */
export class NewsDO extends DurableObject<Env> {
  private readonly router: Hono;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize SQLite schema on every construction (idempotent via IF NOT EXISTS)
    this.ctx.storage.sql.exec(SCHEMA_SQL);

    // Internal Hono router for DO-internal routing
    this.router = new Hono();

    this.router.get("/health", (c) => {
      return c.json({ ok: true, migrated: true });
    });

    this.router.all("*", (c) => {
      return c.json({ ok: false, error: "Not found" }, 404);
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.router.fetch(request);
  }
}
