import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("skills")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const skill = await ctx.db.get(args.id);
    if (!skill || skill.userId !== user._id) throw new Error("Not found");
    return skill;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("skills", {
      userId: user._id,
      name: args.name,
      description: args.description,
      content: args.content,
      category: args.category ?? "other",
      version: 1,
      isTemplate: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const skill = await ctx.db.get(args.id);
    if (!skill || skill.userId !== user._id) throw new Error("Not found");
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    if (updates.content && updates.content !== skill.content) {
      patch.version = skill.version + 1;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const skill = await ctx.db.get(args.id);
    if (!skill || skill.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
