import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";
import type { CreateSkillRequest } from "@dash/shared";

export function registerSkillRoutes(app: FastifyInstance) {
  app.get("/api/skills", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) throw error;
    return data;
  });

  app.get<{ Params: { id: string } }>("/api/skills/:id", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  });

  app.post<{ Body: CreateSkillRequest }>("/api/skills", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("skills")
      .insert({
        user_id: userId,
        name: req.body.name,
        description: req.body.description,
        content: req.body.content,
        category: req.body.category || "other",
        version: 1,
        is_template: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  app.patch<{ Params: { id: string }; Body: Partial<CreateSkillRequest> }>(
    "/api/skills/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      // Increment version on content change
      const updates: any = { ...req.body };
      if (req.body.content) {
        const { data: current } = await supabase
          .from("skills")
          .select("version")
          .eq("id", req.params.id)
          .single();
        if (current) updates.version = current.version + 1;
      }

      const { data, error } = await supabase
        .from("skills")
        .update(updates)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/skills/:id",
    async (req, reply) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", userId);

      if (error) throw error;
      return reply.status(204).send();
    }
  );
}
