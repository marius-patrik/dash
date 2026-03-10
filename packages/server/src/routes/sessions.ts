import type { CreateSessionRequest } from "@dash/shared";
import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";

export function registerSessionRoutes(app: FastifyInstance) {
  // List sessions
  app.get("/api/sessions", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data;
  });

  // Get single session with messages
  app.get<{ Params: { id: string } }>("/api/sessions/:id", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const [sessionRes, messagesRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", req.params.id).eq("user_id", userId).single(),
      supabase
        .from("messages")
        .select("*")
        .eq("session_id", req.params.id)
        .order("created_at", { ascending: true }),
    ]);

    if (sessionRes.error) throw sessionRes.error;
    return { session: sessionRes.data, messages: messagesRes.data || [] };
  });

  // Create session
  app.post<{ Body: CreateSessionRequest }>("/api/sessions", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();
    const body = req.body;

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        name: body.name,
        agent_config_id: body.agent_config_id,
        mcp_server_ids: body.mcp_server_ids || [],
        skill_ids: body.skill_ids || [],
        tags: body.tags || [],
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  // Update session
  app.patch<{ Params: { id: string }; Body: Partial<CreateSessionRequest> }>(
    "/api/sessions/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("sessions")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  );

  // Delete session
  app.delete<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    // Delete messages first
    await supabase.from("messages").delete().eq("session_id", req.params.id);

    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) throw error;
    return reply.status(204).send();
  });
}
