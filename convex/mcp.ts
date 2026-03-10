import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("mcpServers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    command: v.string(),
    args: v.optional(v.array(v.string())),
    envVars: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("mcpServers", {
      userId: user._id,
      name: args.name,
      type: args.type,
      command: args.command,
      args: args.args ?? [],
      envVars: args.envVars,
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("mcpServers"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    envVars: v.optional(v.any()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== user._id) throw new Error("Not found");
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("mcpServers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
