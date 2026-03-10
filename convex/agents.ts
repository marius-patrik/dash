import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("agentConfigs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("agentConfigs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const config = await ctx.db.get(args.id);
    if (!config || config.userId !== user._id) throw new Error("Not found");
    return config;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    parameters: v.optional(
      v.object({
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        maxTurns: v.optional(v.number()),
        maxBudgetUsd: v.optional(v.number()),
        effort: v.optional(v.string()),
      }),
    ),
    toolPermissions: v.optional(
      v.object({
        allowedTools: v.optional(v.array(v.string())),
        disallowedTools: v.optional(v.array(v.string())),
        permissionMode: v.optional(v.string()),
      }),
    ),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("agentConfigs", {
      userId: user._id,
      name: args.name,
      model: args.model,
      systemPrompt: args.systemPrompt,
      parameters: args.parameters,
      toolPermissions: args.toolPermissions,
      isDefault: args.isDefault ?? false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("agentConfigs"),
    name: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    parameters: v.optional(
      v.object({
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        maxTurns: v.optional(v.number()),
        maxBudgetUsd: v.optional(v.number()),
        effort: v.optional(v.string()),
      }),
    ),
    toolPermissions: v.optional(
      v.object({
        allowedTools: v.optional(v.array(v.string())),
        disallowedTools: v.optional(v.array(v.string())),
        permissionMode: v.optional(v.string()),
      }),
    ),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const config = await ctx.db.get(args.id);
    if (!config || config.userId !== user._id) throw new Error("Not found");

    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("agentConfigs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const config = await ctx.db.get(args.id);
    if (!config || config.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
