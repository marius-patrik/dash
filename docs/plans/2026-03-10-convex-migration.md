# Convex Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Supabase + Fastify backend with Convex, replace Supabase Auth with Clerk, flatten the monorepo into a single app.

**Architecture:** Convex handles all database, auth, and serverless functions. Clerk handles authentication with JWT passed to Convex. Claude Agent SDK runs in Convex Node.js actions, streaming via a `streamingState` table that the client reads with reactive queries. Frontend keeps Rsbuild + React 19 + wouter + shadcn/ui.

**Tech Stack:** Convex, Clerk, React 19, Rsbuild, wouter, shadcn/ui, Tailwind CSS 4, Claude Agent SDK

**Design doc:** `docs/plans/2026-03-10-convex-migration-design.md`

---

## Task 1: Flatten Project Structure

Move client source to root, remove monorepo config.

**Files:**
- Move: `packages/client/src/` -> `src/`
- Move: `packages/client/rsbuild.config.ts` -> `rsbuild.config.ts` (overwrite)
- Move: `packages/client/src/index.html` -> `src/index.html`
- Move: `packages/client/tsconfig.json` -> `tsconfig.json`
- Modify: `package.json` (merge deps, remove workspaces)
- Delete: `packages/server/`, `packages/shared/`, `packages/client/`, `supabase/`

**Step 1: Create new root `package.json`**

```json
{
  "name": "dash",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "rsbuild dev",
    "dev:convex": "npx convex dev",
    "build": "rsbuild build",
    "check": "biome check --write .",
    "lint": "biome lint ."
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "latest",
    "@base-ui/react": "^1.2.0",
    "@clerk/clerk-react": "^5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "convex": "^1",
    "lucide-react": "^0.577.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "shadcn": "^4.0.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "wouter": "^3.9.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.6",
    "@rsbuild/core": "^1",
    "@rsbuild/plugin-react": "^1",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Step 2: Move files**

```bash
# Move client source to root
cp -r packages/client/src/ src/
cp packages/client/rsbuild.config.ts rsbuild.config.ts
cp packages/client/tsconfig.json tsconfig.json

# Remove old packages and supabase
rm -rf packages/ supabase/

# Remove bun lockfile (will regenerate)
rm -f bun.lock

# Remove .env symlinks if they exist
rm -f packages/server/.env packages/client/.env
```

**Step 3: Update `rsbuild.config.ts`**

Replace Supabase env vars with Convex + Clerk:

```typescript
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
    define: {
      "process.env.NEXT_PUBLIC_CONVEX_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_CONVEX_URL || "",
      ),
      "process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": JSON.stringify(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
      ),
    },
  },
  html: {
    template: "./src/index.html",
    title: "Dash — AI Agent Dashboard",
  },
  output: {
    distPath: { root: "dist" },
    assetPrefix: "/",
  },
  tools: {
    postcss: {
      postcssOptions: {
        plugins: [require("@tailwindcss/postcss")],
      },
    },
  },
  server: {
    port: 3000,
    historyApiFallback: true,
  },
});
```

**Step 4: Update `tsconfig.json`**

Add `convex/_generated` to the project:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "convex"]
}
```

**Step 5: Install deps and verify**

```bash
bun install
```

Expected: installs successfully. Build won't work yet (import paths broken).

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: flatten monorepo to single app structure"
```

---

## Task 2: Set Up Convex + Schema

Initialize Convex project and create the database schema.

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/tsconfig.json`

**Step 1: Initialize Convex**

```bash
npx convex init
```

This creates `convex/` directory, `convex.json`, and prompts for project setup.

**Step 2: Create `convex/schema.ts`**

```typescript
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
```

**Step 3: Verify schema deploys**

```bash
npx convex dev
```

Expected: schema syncs to Convex cloud, generates `convex/_generated/`.

**Step 4: Commit**

```bash
git add convex/ convex.json
git commit -m "feat: add Convex schema with all tables"
```

---

## Task 3: Auth Helper + User Management

Create the Convex auth helper and Clerk user sync.

**Files:**
- Create: `convex/users.ts`

**Step 1: Create `convex/users.ts`**

This file handles:
- Getting the current authenticated user (used by all other functions)
- Clerk webhook to sync users on signup

```typescript
import { v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";

// Get current user from Clerk identity
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

// Query: get current user
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// Mutation: create or update user from Clerk webhook / first login
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      settings: {},
    });
  },
});

// Ensure user exists on first authenticated request
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      displayName: identity.name ?? identity.email ?? "User",
      avatarUrl: identity.pictureUrl,
      settings: {},
    });
  },
});
```

**Step 2: Verify with `npx convex dev`**

Expected: functions sync, no type errors.

**Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat: add Convex user management with Clerk auth"
```

---

## Task 4: CRUD Functions — Agent Configs

**Files:**
- Create: `convex/agents.ts`

**Step 1: Create `convex/agents.ts`**

```typescript
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
    // Filter out undefined values
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
```

**Step 2: Verify with `npx convex dev`**

**Step 3: Commit**

```bash
git add convex/agents.ts
git commit -m "feat: add Convex agent config CRUD functions"
```

---

## Task 5: CRUD Functions — MCP, Skills, Memory, Context Presets

These all follow the same pattern. Create four files.

**Files:**
- Create: `convex/mcp.ts`
- Create: `convex/skills.ts`
- Create: `convex/memory.ts`
- Create: `convex/contextPresets.ts`

**Step 1: Create `convex/mcp.ts`**

```typescript
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
```

**Step 2: Create `convex/skills.ts`**

```typescript
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
    // Auto-increment version if content changed
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
```

**Step 3: Create `convex/memory.ts`**

```typescript
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
```

**Step 4: Create `convex/contextPresets.ts`**

```typescript
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
```

**Step 5: Verify with `npx convex dev`**

**Step 6: Commit**

```bash
git add convex/mcp.ts convex/skills.ts convex/memory.ts convex/contextPresets.ts
git commit -m "feat: add CRUD functions for MCP, skills, memory, context presets"
```

---

## Task 6: Sessions + Messages + Streaming Functions

The core of the app — session management, message queries, and the streaming state.

**Files:**
- Create: `convex/sessions.ts`
- Create: `convex/messages.ts`

**Step 1: Create `convex/messages.ts`**

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
```

**Step 2: Create `convex/sessions.ts`**

```typescript
import { v } from "convex/values";
import { type Id, type Doc } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
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
    await ctx.scheduler.runAfter(0, internal.sessions.runAgent, {
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

// --- Internal mutations (called from action) ---

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
```

**Step 3: Verify with `npx convex dev`**

**Step 4: Commit**

```bash
git add convex/sessions.ts convex/messages.ts
git commit -m "feat: add session CRUD, message queries, and streaming state management"
```

---

## Task 7: Agent Action (Claude SDK Integration)

Port the agent service to a Convex Node.js action.

**Files:**
- Create: `convex/agent.ts`

**Step 1: Create `convex/agent.ts`**

This file must have `"use node"` at the top to use Node.js runtime (needed for Claude Agent SDK).

```typescript
"use node";

import { query } from "@anthropic-ai/claude-agent-sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// This is the scheduled action called by sessions.sendMessage
export const runAgent = internalAction({
  args: {
    sessionId: v.id("sessions"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch session config
    const session = await ctx.runQuery(internal.sessions.getInternal, {
      sessionId: args.sessionId,
    });
    if (!session) {
      await ctx.runMutation(internal.sessions.finishStreaming, {
        sessionId: args.sessionId,
        content: "",
        error: "Session not found",
      });
      return;
    }

    const { agentConfig, mcpServers, skills, memories } = session;

    // Assemble system prompt
    const promptParts: string[] = [];
    if (agentConfig.systemPrompt) promptParts.push(agentConfig.systemPrompt);
    if (skills.length > 0) {
      promptParts.push("\n--- Active Skills ---");
      for (const skill of skills) {
        promptParts.push(`\n## ${skill.name}\n${skill.content}`);
      }
    }
    if (memories.length > 0) {
      promptParts.push("\n--- Persistent Memory ---");
      for (const mem of memories) {
        promptParts.push(`- ${mem.key}: ${mem.value}`);
      }
    }
    const systemPrompt = promptParts.join("\n");

    // Build MCP config
    const mcpConfig: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};
    for (const server of mcpServers) {
      if (server.status !== "active") continue;
      mcpConfig[server.name] = {
        command: server.command,
        args: server.args,
        ...(server.envVars && Object.keys(server.envVars).length > 0 && { env: server.envVars }),
      };
    }

    const queryOptions: Record<string, unknown> = {
      systemPrompt,
      includePartialMessages: true,
      model: agentConfig.model || undefined,
      maxTurns: agentConfig.parameters?.maxTurns,
      maxBudgetUsd: agentConfig.parameters?.maxBudgetUsd,
      effort: agentConfig.parameters?.effort,
      allowedTools: agentConfig.toolPermissions?.allowedTools,
      disallowedTools: agentConfig.toolPermissions?.disallowedTools,
      permissionMode: agentConfig.toolPermissions?.permissionMode || "acceptEdits",
    };

    if (Object.keys(mcpConfig).length > 0) {
      queryOptions.mcpServers = mcpConfig;
    }
    if (session.agentSessionId) {
      queryOptions.resume = session.agentSessionId;
    }

    let agentSessionId = session.agentSessionId || "";
    let totalCost = 0;
    let accumulatedText = "";
    let lastFlushTime = Date.now();
    const activeTools: Record<string, { name: string; input: string }> = {};
    const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
    let finalText = "";

    try {
      for await (const message of query({
        prompt: args.prompt,
        options: queryOptions as any,
      })) {
        // Check cancellation periodically
        const cancelled = await ctx.runMutation(internal.sessions.isStreamCancelled, {
          sessionId: args.sessionId,
        });
        if (cancelled) break;

        switch (message.type) {
          case "system":
            if (message.subtype === "init" && message.session_id) {
              agentSessionId = message.session_id;
            }
            break;

          case "stream_event": {
            const event = message.event as any;

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              accumulatedText += event.delta.text;
              // Batch text updates every ~100ms
              if (Date.now() - lastFlushTime > 100) {
                await ctx.runMutation(internal.sessions.updateStreamingText, {
                  sessionId: args.sessionId,
                  text: accumulatedText,
                });
                lastFlushTime = Date.now();
              }
            }

            if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
              activeTools[event.content_block.id] = {
                name: event.content_block.name,
                input: "",
              };
              await ctx.runMutation(internal.sessions.updateStreamingTools, {
                sessionId: args.sessionId,
                activeTools: { ...activeTools },
              });
            }

            if (event.type === "content_block_delta" && event.delta?.type === "input_json_delta") {
              // Find the active tool and append input
              for (const tool of Object.values(activeTools)) {
                tool.input += event.delta.partial_json;
              }
            }

            if (event.type === "content_block_stop") {
              // Clear completed tools
              // (simplified: clear all on stop)
            }
            break;
          }

          case "assistant": {
            const content = (message as any).message?.content;
            if (content) {
              const textParts: string[] = [];
              for (const block of content) {
                if ("text" in block) textParts.push(block.text);
                if (block.type === "tool_use") {
                  toolCalls.push({
                    id: block.id,
                    name: block.name,
                    input: block.input as Record<string, unknown>,
                  });
                }
              }
              finalText = textParts.join("");
              accumulatedText = finalText;
              // Flush final text
              await ctx.runMutation(internal.sessions.updateStreamingText, {
                sessionId: args.sessionId,
                text: accumulatedText,
              });
            }
            break;
          }

          case "result": {
            totalCost = (message as any).total_cost_usd || 0;
            break;
          }
        }
      }

      // Flush any remaining text
      if (accumulatedText !== finalText) {
        await ctx.runMutation(internal.sessions.updateStreamingText, {
          sessionId: args.sessionId,
          text: accumulatedText,
        });
      }

      await ctx.runMutation(internal.sessions.finishStreaming, {
        sessionId: args.sessionId,
        content: accumulatedText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        costUsd: totalCost,
        agentSessionId: agentSessionId || undefined,
      });
    } catch (err: any) {
      await ctx.runMutation(internal.sessions.finishStreaming, {
        sessionId: args.sessionId,
        content: accumulatedText,
        error: err.message || "Agent query failed",
      });
    }
  },
});
```

**Step 2: Add internal session query for the action**

Add to `convex/sessions.ts`:

```typescript
import { internalQuery } from "./_generated/server";

// Internal query used by agent action to fetch session config
export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const agentConfig = session.agentConfigId
      ? await ctx.db.get(session.agentConfigId)
      : null;
    if (!agentConfig) return null;

    // Fetch MCP servers
    const mcpServers = [];
    for (const id of session.mcpServerIds) {
      const server = await ctx.db.get(id);
      if (server) mcpServers.push(server);
    }

    // Fetch skills
    const skills = [];
    for (const id of session.skillIds) {
      const skill = await ctx.db.get(id);
      if (skill) skills.push(skill);
    }

    // Fetch all user memories
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
```

**Step 3: Set Claude API key as Convex env var**

```bash
npx convex env set CLAUDE_CODE_OAUTH_TOKEN "your-token-here"
# or
npx convex env set ANTHROPIC_API_KEY "your-key-here"
```

**Step 4: Verify with `npx convex dev`**

**Step 5: Commit**

```bash
git add convex/agent.ts convex/sessions.ts
git commit -m "feat: add Claude Agent SDK action with streaming via Convex mutations"
```

---

## Task 8: Frontend — Convex Provider + Auth

Wire up Clerk and Convex on the client side.

**Files:**
- Create: `src/providers/convex-provider.tsx`
- Modify: `src/index.tsx`
- Delete: `src/providers/auth-provider.tsx`
- Delete: `src/lib/supabase.ts`

**Step 1: Create `src/providers/convex-provider.tsx`**

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

**Step 2: Update `src/index.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ConvexProvider } from "./providers/convex-provider";
import { AppRouter } from "./router";
import "./app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider>
      <AppRouter />
      <Toaster />
    </ConvexProvider>
  </React.StrictMode>,
);
```

**Step 3: Delete old auth files**

```bash
rm src/providers/auth-provider.tsx src/lib/supabase.ts src/lib/api.ts src/lib/ws.ts
```

**Step 4: Commit**

```bash
git add src/providers/ src/index.tsx
git commit -m "feat: add Convex + Clerk provider, remove Supabase auth"
```

---

## Task 9: Frontend — Constants + Router

Move shared constants to the frontend and update the router.

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/router.tsx`

**Step 1: Create `src/lib/constants.ts`**

Copy constants from the old `packages/shared/src/constants.ts`. Read that file first to get exact contents — it exports `AVAILABLE_MODELS`, `SKILL_CATEGORIES`, `BUILT_IN_TOOLS`.

**Step 2: Update `src/router.tsx`**

Replace `ProtectedRoute` with Convex's `Authenticated` / `Unauthenticated`:

```typescript
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Redirect, Route, Switch } from "wouter";
import EditAgentPage from "./app/dashboard/agents/[id]/page";
import AgentsPage from "./app/dashboard/agents/page";
import ContextPresetsPage from "./app/dashboard/context/page";
import DashboardLayout from "./app/dashboard/layout";
import McpPage from "./app/dashboard/mcp/page";
import MemoryPage from "./app/dashboard/memory/page";
import DashboardPage from "./app/dashboard/page";
import SessionPage from "./app/dashboard/sessions/[id]/page";
import NewSessionPage from "./app/dashboard/sessions/new/page";
import SessionsPage from "./app/dashboard/sessions/page";
import SettingsPage from "./app/dashboard/settings/page";
import EditSkillPage from "./app/dashboard/skills/[id]/page";
import SkillsPage from "./app/dashboard/skills/page";
import LoginPage from "./app/login/page";

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/dashboard/sessions/new" component={NewSessionPage} />
        <Route path="/dashboard/sessions/:id" component={SessionPage} />
        <Route path="/dashboard/sessions" component={SessionsPage} />
        <Route path="/dashboard/agents/:id" component={EditAgentPage} />
        <Route path="/dashboard/agents" component={AgentsPage} />
        <Route path="/dashboard/mcp" component={McpPage} />
        <Route path="/dashboard/skills/:id" component={EditSkillPage} />
        <Route path="/dashboard/skills" component={SkillsPage} />
        <Route path="/dashboard/memory" component={MemoryPage} />
        <Route path="/dashboard/context" component={ContextPresetsPage} />
        <Route path="/dashboard/settings" component={SettingsPage} />
      </Switch>
    </DashboardLayout>
  );
}

export function AppRouter() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route>
            <Redirect href="/login" replace />
          </Route>
        </Switch>
      </Unauthenticated>
      <Authenticated>
        <Switch>
          <Route path="/dashboard/:rest*" component={DashboardRoutes} />
          <Route path="/dashboard" component={DashboardRoutes} />
          <Route>
            <Redirect href="/dashboard" replace />
          </Route>
        </Switch>
      </Authenticated>
    </>
  );
}
```

**Step 3: Commit**

```bash
git add src/lib/constants.ts src/router.tsx
git commit -m "feat: add constants, update router for Convex auth"
```

---

## Task 10: Frontend — Login Page with Clerk

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Rewrite login page**

```typescript
import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignIn routing="hash" afterSignInUrl="/dashboard" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: replace Supabase login with Clerk SignIn"
```

---

## Task 11: Frontend — useChat Hook (Convex Reactive)

**Files:**
- Modify: `src/lib/hooks/use-chat.ts`

**Step 1: Rewrite useChat**

```typescript
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function useChat(sessionId: string) {
  const typedSessionId = sessionId as Id<"sessions">;
  const messages = useQuery(api.messages.bySession, { sessionId: typedSessionId });
  const stream = useQuery(api.sessions.getStreamingState, { sessionId: typedSessionId });
  const sendMessageMutation = useMutation(api.sessions.sendMessage);
  const cancelMutation = useMutation(api.sessions.cancelStream);

  return {
    messages: messages ?? [],
    streamingText: stream?.text ?? "",
    activeTools: stream?.activeTools
      ? new Map(Object.entries(stream.activeTools as Record<string, { name: string; input: string }>))
      : new Map<string, { name: string; input: string }>(),
    isStreaming: stream?.isStreaming ?? false,
    error: stream?.error ?? null,
    lastCostUsd: stream?.costUsd ?? null,
    sendMessage: (content: string) => sendMessageMutation({ sessionId: typedSessionId, content }),
    abort: () => cancelMutation({ sessionId: typedSessionId }),
    // No-ops for backwards compat with ChatView
    connect: () => {},
    disconnect: () => {},
    setMessages: () => {},
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/hooks/use-chat.ts
git commit -m "feat: rewrite useChat hook with Convex reactive queries"
```

---

## Task 12: Frontend — Rewire All Dashboard Pages

Update every page to use Convex `useQuery` / `useMutation` instead of `apiGet` / `apiPost`.

This is the largest task. Each page follows the same pattern:
1. Remove `import { apiGet, apiPost, ... } from "@/lib/api"` and `import type { ... } from "@dash/shared"`
2. Add `import { useQuery, useMutation } from "convex/react"` and `import { api } from "path/to/convex/_generated/api"`
3. Replace `useState` + `useEffect` + `apiGet` with `useQuery`
4. Replace `apiPost`/`apiPatch`/`apiDelete` with `useMutation`
5. Replace `@dash/shared` type references — types are now inferred from Convex schema (use `Doc<"tableName">` from `convex/_generated/dataModel`)

**Files to modify (one by one):**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/sessions/page.tsx`
- `src/app/dashboard/sessions/new/page.tsx`
- `src/app/dashboard/sessions/[id]/page.tsx`
- `src/app/dashboard/agents/page.tsx`
- `src/app/dashboard/agents/[id]/page.tsx`
- `src/app/dashboard/mcp/page.tsx`
- `src/app/dashboard/skills/page.tsx`
- `src/app/dashboard/skills/[id]/page.tsx`
- `src/app/dashboard/memory/page.tsx`
- `src/app/dashboard/context/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/components/chat/chat-view.tsx`
- `src/components/chat/message.tsx`
- `src/components/chat/input.tsx`
- `src/components/chat/tool-call.tsx` (if exists)

**Pattern for each page:**

For example, `agents/page.tsx` changes from:

```typescript
import type { AgentConfig } from "@dash/shared";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
// useState + useEffect pattern
const [agents, setAgents] = useState<AgentConfig[]>([]);
useEffect(() => { apiGet("/api/agents").then(setAgents) }, []);
```

To:

```typescript
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// Reactive query
const agents = useQuery(api.agents.list) ?? [];
const createAgent = useMutation(api.agents.create);
const deleteAgent = useMutation(api.agents.remove);
```

**Do each page, verify it compiles, then commit.** Group small related pages in single commits (e.g., all agent pages together, all skill pages together).

**Step 1: Rewire dashboard overview page**
**Step 2: Rewire agents pages (list + edit)**
**Step 3: Rewire sessions pages (list + new + detail)**
**Step 4: Rewire MCP page**
**Step 5: Rewire skills pages (list + edit)**
**Step 6: Rewire memory page**
**Step 7: Rewire context presets page**
**Step 8: Rewire settings page**
**Step 9: Update chat components (chat-view, message, input)**
**Step 10: Commit after each group passes type check**

```bash
# After each group
bun run build  # verify no type errors
git add -A && git commit -m "feat: rewire [group] pages to Convex"
```

---

## Task 13: Cleanup

Remove all remaining Supabase / old server references.

**Files:**
- Delete: any remaining `@dash/shared` imports (should be none after Task 12)
- Clean: `biome.json` — update `files.includes` for flat structure
- Clean: `.gitignore` — remove Supabase entries, add Convex entries
- Clean: `.env` — replace with Convex + Clerk vars
- Delete: `.vercel` directory (will re-link)

**Step 1: Update `biome.json`**

Change `includes` from `["packages/**", ...]` to `["src/**", "convex/**", "*.json", "*.ts"]`.

**Step 2: Update `.env`**

```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Step 3: Update `.gitignore`**

Remove Supabase lines, add:
```
.convex
```

**Step 4: Final build check**

```bash
bun run build
```

Expected: builds successfully with no errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup old Supabase/Fastify references, update config for Convex"
```

---

## Task 14: Deploy

**Step 1: Deploy Convex to production**

```bash
npx convex deploy
```

**Step 2: Set up Clerk**

- Create Clerk application at clerk.com
- Enable GitHub + Google OAuth providers
- Get publishable key and secret key
- Configure Convex JWT template in Clerk dashboard

**Step 3: Set Convex environment variables**

```bash
npx convex env set CLERK_SECRET_KEY "sk_test_..."
npx convex env set CLAUDE_CODE_OAUTH_TOKEN "your-token"
```

**Step 4: Deploy frontend to Vercel**

```bash
vercel link
vercel env add NEXT_PUBLIC_CONVEX_URL
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel deploy --prod
```

**Step 5: Verify end-to-end**

- Sign in via Clerk
- Create an agent config
- Create a session
- Send a message, see streaming response
- Verify all CRUD pages work

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: deployment configuration for Convex + Clerk + Vercel"
```

---

## Summary

| Task | What | Commits |
|------|------|---------|
| 1 | Flatten monorepo | 1 |
| 2 | Convex schema | 1 |
| 3 | User auth helper | 1 |
| 4 | Agent configs CRUD | 1 |
| 5 | MCP/Skills/Memory/Presets CRUD | 1 |
| 6 | Sessions + Messages + Streaming | 1 |
| 7 | Agent action (Claude SDK) | 1 |
| 8 | Convex + Clerk provider | 1 |
| 9 | Constants + Router | 1 |
| 10 | Login page (Clerk) | 1 |
| 11 | useChat hook (reactive) | 1 |
| 12 | Rewire all pages | ~8 |
| 13 | Cleanup | 1 |
| 14 | Deploy | 1 |
| **Total** | | **~20 commits** |
