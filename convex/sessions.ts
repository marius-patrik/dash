import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";

// --- Queries ---

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== user._id) throw new Error("Not found");
    return session;
  },
});

export const getStreamingState = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    name: v.string(),
    agentConfigId: v.id("agentConfigs"),
    mcpServerIds: v.optional(v.array(v.id("mcpServers"))),
    skillIds: v.optional(v.array(v.id("skills"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("sessions", {
      userId: user._id,
      agentConfigId: args.agentConfigId,
      name: args.name,
      status: "active",
      tags: args.tags ?? [],
      mcpServerIds: args.mcpServerIds ?? [],
      skillIds: args.skillIds ?? [],
      metadata: {},
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("sessions"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== user._id) throw new Error("Not found");
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== user._id) throw new Error("Not found");
    // Delete all messages in session
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    // Delete streaming state
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .unique();
    if (stream) await ctx.db.delete(stream._id);
    await ctx.db.delete(args.id);
  },
});

// Send message: save user msg, init streaming state, schedule agent action
export const sendMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new Error("Not found");

    // Save user message
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
    });

    // Reset or create streaming state
    const existing = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        text: "",
        activeTools: {},
        isStreaming: true,
        cancelled: false,
        error: undefined,
        costUsd: undefined,
      });
    } else {
      await ctx.db.insert("streamingState", {
        sessionId: args.sessionId,
        text: "",
        isStreaming: true,
        cancelled: false,
      });
    }

    // Schedule the agent action
    await ctx.scheduler.runAfter(0, internal.agent.runAgent, {
      sessionId: args.sessionId,
      prompt: args.content,
    });
  },
});

export const cancelStream = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (stream) {
      await ctx.db.patch(stream._id, { cancelled: true, isStreaming: false });
    }
  },
});

// --- Internal mutations (called from agent action) ---

export const updateStreamingText = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (stream) {
      await ctx.db.patch(stream._id, { text: args.text });
    }
  },
});

export const updateStreamingTools = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    activeTools: v.any(),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (stream) {
      await ctx.db.patch(stream._id, { activeTools: args.activeTools });
    }
  },
});

export const finishStreaming = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    content: v.string(),
    toolCalls: v.optional(v.any()),
    costUsd: v.optional(v.number()),
    agentSessionId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Save assistant message
    if (args.content || args.toolCalls) {
      await ctx.db.insert("messages", {
        sessionId: args.sessionId,
        role: "assistant",
        content: args.content,
        toolCalls: args.toolCalls,
        costUsd: args.costUsd,
      });
    }

    // Update session with agent session ID
    if (args.agentSessionId) {
      await ctx.db.patch(args.sessionId, {
        agentSessionId: args.agentSessionId,
      });
    }

    // Update streaming state
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (stream) {
      await ctx.db.patch(stream._id, {
        isStreaming: false,
        costUsd: args.costUsd,
        error: args.error,
      });
    }
  },
});

export const isStreamCancelled = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("streamingState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    return stream?.cancelled ?? false;
  },
});

// --- Internal query (used by agent action) ---

export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const agentConfig = session.agentConfigId ? await ctx.db.get(session.agentConfigId) : null;
    if (!agentConfig) return null;

    const mcpServers = [];
    for (const id of session.mcpServerIds) {
      const server = await ctx.db.get(id);
      if (server) mcpServers.push(server);
    }

    const skills = [];
    for (const id of session.skillIds) {
      const skill = await ctx.db.get(id);
      if (skill) skills.push(skill);
    }

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return {
      ...session,
      agentConfig,
      mcpServers,
      skills,
      memories,
    };
  },
});
