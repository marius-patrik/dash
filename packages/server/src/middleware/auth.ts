import type { FastifyRequest, FastifyReply } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";
import { config } from "../config";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip auth if Supabase is not configured (dev mode)
  if (!config.hasSupabase) {
    (request as any).userId = "dev-user";
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing authorization header" });
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  (request as any).userId = user.id;
  (request as any).accessToken = token;
}
