import type { CreateMcpServerRequest } from "@dash/shared";
import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";

export function registerMcpRoutes(app: FastifyInstance) {
  app.get("/api/mcp", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("mcp_servers")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) throw error;
    return data;
  });

  app.post<{ Body: CreateMcpServerRequest }>("/api/mcp", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("mcp_servers")
      .insert({
        user_id: userId,
        name: req.body.name,
        type: req.body.type,
        command: req.body.command,
        args: req.body.args || [],
        env_vars: req.body.env_vars || {},
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  app.patch<{ Params: { id: string }; Body: Partial<CreateMcpServerRequest> }>(
    "/api/mcp/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("mcp_servers")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/mcp/:id", async (req, reply) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("mcp_servers")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) throw error;
    return reply.status(204).send();
  });
}
