import Fastify from "fastify";
import fastifyWebSocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import path from "path";
import { config } from "./config";
import { authMiddleware } from "./middleware/auth";
import { registerHealthRoutes } from "./routes/health";
import { registerSessionRoutes } from "./routes/sessions";
import { registerAgentRoutes } from "./routes/agents";
import { registerMcpRoutes } from "./routes/mcp";
import { registerSkillRoutes } from "./routes/skills";
import { registerMemoryRoutes } from "./routes/memory";
import { registerChatWebSocket } from "./ws/chat";

async function main() {
  const app = Fastify({ logger: true });

  // CORS — allow all origins in dev, restrict in production
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // WebSocket support
  await app.register(fastifyWebSocket);

  // Auth middleware for /api/* routes
  app.addHook("onRequest", async (req, reply) => {
    if (
      req.url.startsWith("/api/") &&
      req.url !== "/api/health"
    ) {
      await authMiddleware(req, reply);
    }
  });

  // REST API routes
  registerHealthRoutes(app);
  registerSessionRoutes(app);
  registerAgentRoutes(app);
  registerMcpRoutes(app);
  registerSkillRoutes(app);
  registerMemoryRoutes(app);

  // WebSocket chat
  registerChatWebSocket(app);

  // Serve Next.js static export in production
  const clientDist = path.resolve(
    import.meta.dir,
    config.clientDistPath
  );

  const { existsSync } = await import("fs");
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: "/",
      decorateReply: false,
      wildcard: false,
    });

    // SPA fallback — serve index.html for unmatched routes
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith("/api/") || req.url.startsWith("/ws/")) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  } else {
    console.log(`  Static files: ${clientDist} not found (run client build first)`);
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith("/api/") || req.url.startsWith("/ws/")) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply.status(200).send({ message: "Client not built. Run: bun run --filter @dash/client build" });
    });
  }

  // Start
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`\n  Dashboard server running at http://${config.host}:${config.port}`);
    console.log(`  Claude auth: ${config.hasClaudeAuth ? "configured" : "NOT configured"}`);
    console.log(`  Supabase: ${config.hasSupabase ? "configured" : "NOT configured (dev mode)"}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
