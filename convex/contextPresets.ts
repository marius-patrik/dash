import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("contextPresets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("contextPresets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset || preset.userId !== user._id) throw new Error("Not found");
    return preset;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    includedMemories: v.optional(v.array(v.id("memories"))),
    includedFiles: v.optional(v.array(v.string())),
    includedSkills: v.optional(v.array(v.id("skills"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("contextPresets", {
      userId: user._id,
      name: args.name,
      description: args.description,
      includedMemories: args.includedMemories ?? [],
      includedFiles: args.includedFiles ?? [],
      includedSkills: args.includedSkills ?? [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contextPresets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    includedMemories: v.optional(v.array(v.id("memories"))),
    includedFiles: v.optional(v.array(v.string())),
    includedSkills: v.optional(v.array(v.id("skills"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset || preset.userId !== user._id) throw new Error("Not found");
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("contextPresets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset || preset.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
