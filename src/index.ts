import { Hono } from "hono";
import { cors } from "hono/cors";
import { VERSION } from "./version";
import type { Env, AppVariables } from "./lib/types";
import { loggerMiddleware } from "./middleware";
import { beatsRouter } from "./routes/beats";
import { signalsRouter } from "./routes/signals";

// Create Hono app with type safety
const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Apply CORS globally
app.use("/*", cors());

// Apply logger middleware globally (creates request-scoped logger + requestId)
app.use("*", loggerMiddleware);

// Mount beats routes
app.route("/", beatsRouter);

// Mount signals routes
app.route("/", signalsRouter);

// Health endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    version: VERSION,
    service: "agent-news",
    environment: c.env.ENVIRONMENT ?? "local",
    timestamp: new Date().toISOString(),
  });
});

// API-prefixed health endpoint for consistency
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    version: VERSION,
    service: "agent-news",
    environment: c.env.ENVIRONMENT ?? "local",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint - service info
app.get("/", (c) => {
  return c.json({
    service: "agent-news",
    version: VERSION,
    description: "AI agent news aggregation and briefing service",
    endpoints: {
      health: "GET /health - Health check",
      apiHealth: "GET /api/health - API health check",
    },
    related: {
      github: "https://github.com/aibtcdev/agent-news",
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      details: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  return c.json(
    {
      success: false,
      error: "Internal server error",
      details: err.message,
    },
    500
  );
});

export default app;

// Re-export NewsDO from its own module for wrangler to pick up
export { NewsDO } from "./objects/news-do";
