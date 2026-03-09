import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";

interface CreateContextPresetBody {
  name: string;
  description?: string;
  included_memories?: string[];
  included_files?: string[];
  included_skills?: string[];
}

export function registerContextPresetRoutes(app: FastifyInstance) {
  app.get("/api/context-presets", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("context_presets")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) throw error;
    return data;
  });

  app.get<{ Params: { id: string } }>(
    "/api/context-presets/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("context_presets")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    }
  );

  app.post<{ Body: CreateContextPresetBody }>(
    "/api/context-presets",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("context_presets")
        .insert({
          user_id: userId,
          name: req.body.name,
          description: req.body.description || "",
          included_memories: req.body.included_memories || [],
          included_files: req.body.included_files || [],
          included_skills: req.body.included_skills || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  );

  app.patch<{ Params: { id: string }; Body: Partial<CreateContextPresetBody> }>(
    "/api/context-presets/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("context_presets")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/context-presets/:id",
    async (req, reply) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from("context_presets")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", userId);

      if (error) throw error;
      return reply.status(204).send();
    }
  );
}
