import { Hono } from "hono";
import type { Env, AppVariables } from "../lib/types";
import { getLatestBrief, getBriefByDate } from "../lib/do-client";

const briefRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/brief — get the most recent compiled brief
briefRouter.get("/api/brief", async (c) => {
  const format = c.req.query("format") ?? "json";
  const brief = await getLatestBrief(c.env);

  if (!brief) {
    return c.json(
      {
        error: "No briefs compiled yet",
        hint: "POST /api/brief/compile to compile the first brief",
      },
      404
    );
  }

  if (format === "text") {
    return new Response(brief.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  const jsonData = brief.json_data ? (JSON.parse(brief.json_data) as Record<string, unknown>) : {};

  return c.json({
    date: brief.date,
    compiled_at: brief.compiled_at,
    inscribed_txid: brief.inscribed_txid ?? null,
    inscription_id: brief.inscription_id ?? null,
    ...jsonData,
    text: brief.text,
  });
});

// GET /api/brief/:date — get a specific brief by date
briefRouter.get("/api/brief/:date", async (c) => {
  const date = c.req.param("date");

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json(
      { error: "Invalid date format", hint: "Use YYYY-MM-DD" },
      400
    );
  }

  const format = c.req.query("format") ?? "json";
  const brief = await getBriefByDate(c.env, date);

  if (!brief) {
    return c.json({ error: `No brief found for ${date}` }, 404);
  }

  if (format === "text") {
    return new Response(brief.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  const jsonData = brief.json_data ? (JSON.parse(brief.json_data) as Record<string, unknown>) : {};

  return c.json({
    date: brief.date,
    compiled_at: brief.compiled_at,
    inscribed_txid: brief.inscribed_txid ?? null,
    inscription_id: brief.inscription_id ?? null,
    ...jsonData,
    text: brief.text,
  });
});

export { briefRouter };
