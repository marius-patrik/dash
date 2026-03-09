import type { FastifyInstance } from "fastify";
import { config } from "../config";

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => ({
    status: "ok",
    claude_auth: config.hasClaudeAuth,
    supabase: config.hasSupabase,
    timestamp: new Date().toISOString(),
  }));
}
