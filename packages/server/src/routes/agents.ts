import type { CreateAgentConfigRequest } from "@dash/shared";
import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";

export function registerAgentRoutes(app: FastifyInstance) {
  app.get("/api/agents", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  });

  app.get<{ Params: { id: string } }>("/api/agents/:id", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  });

  app.post<{ Body: CreateAgentConfigRequest }>("/api/agents", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("agent_configs")
      .insert({
        user_id: userId,
        name: req.body.name,
        model: req.body.model,
        system_prompt: req.body.system_prompt,
        parameters: req.body.parameters || {},
        tool_permissions: req.body.tool_permissions || {},
        is_default: req.body.is_default || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  app.patch<{ Params: { id: string }; Body: Partial<CreateAgentConfigRequest> }>(
    "/api/agents/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("agent_configs")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("agent_configs")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) throw error;
    return reply.status(204).send();
  });
}
