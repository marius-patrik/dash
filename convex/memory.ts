import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("memories", {
      userId: user._id,
      key: args.key,
      value: args.value,
      category: args.category ?? "other",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("memories"),
    key: v.optional(v.string()),
    value: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memory = await ctx.db.get(args.id);
    if (!memory || memory.userId !== user._id) throw new Error("Not found");
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const memory = await ctx.db.get(args.id);
    if (!memory || memory.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
