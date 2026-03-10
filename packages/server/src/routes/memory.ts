import type { CreateMemoryRequest } from "@dash/shared";
import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin } from "../db/supabase";

export function registerMemoryRoutes(app: FastifyInstance) {
  app.get("/api/memory", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("category")
      .order("key");

    if (error) throw error;
    return data;
  });

  app.post<{ Body: CreateMemoryRequest }>("/api/memory", async (req) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("memories")
      .insert({
        user_id: userId,
        key: req.body.key,
        value: req.body.value,
        category: req.body.category || "other",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  app.patch<{ Params: { id: string }; Body: Partial<CreateMemoryRequest> }>(
    "/api/memory/:id",
    async (req) => {
      const userId = (req as any).userId;
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("memories")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/memory/:id", async (req, reply) => {
    const userId = (req as any).userId;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) throw error;
    return reply.status(204).send();
  });
}
