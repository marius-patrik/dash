import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    settings: v.optional(v.any()),
  }).index("by_clerk_id", ["clerkId"]),

  agentConfigs: defineTable({
    userId: v.id("users"),
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
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  mcpServers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.string(),
    command: v.string(),
    args: v.array(v.string()),
    envVars: v.optional(v.any()),
    status: v.string(),
  }).index("by_user", ["userId"]),

  skills: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    category: v.string(),
    version: v.number(),
    isTemplate: v.boolean(),
  }).index("by_user", ["userId"]),

  memories: defineTable({
    userId: v.id("users"),
    key: v.string(),
    value: v.string(),
    category: v.string(),
  }).index("by_user", ["userId"]),

  sessions: defineTable({
    userId: v.id("users"),
    agentConfigId: v.optional(v.id("agentConfigs")),
    agentSessionId: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    tags: v.array(v.string()),
    mcpServerIds: v.array(v.id("mcpServers")),
    skillIds: v.array(v.id("skills")),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.string(),
    content: v.string(),
    toolCalls: v.optional(v.any()),
    toolResults: v.optional(v.any()),
    tokenCount: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),

  streamingState: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    activeTools: v.optional(v.any()),
    isStreaming: v.boolean(),
    cancelled: v.optional(v.boolean()),
    error: v.optional(v.string()),
    costUsd: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),

  contextPresets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    includedMemories: v.array(v.id("memories")),
    includedFiles: v.array(v.string()),
    includedSkills: v.array(v.id("skills")),
  }).index("by_user", ["userId"]),
});
