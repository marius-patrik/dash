# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dash is a personal web dashboard for managing AI agents remotely. It provides a configurable agent environment with control over MCP servers, skills, memory, context, and sessions. The app uses the Claude Agent SDK to run agents via Convex serverless actions.

## Commands

```bash
bun run dev           # Start Rsbuild dev server (port 3000)
npx convex dev        # Start Convex dev server (watches convex/ for changes)
bun run build         # Production build
bun run check         # Biome lint + format with auto-fix
bun run lint          # Biome lint only (no fix)
```

Both `bun run dev` and `npx convex dev` must run simultaneously during development.

## Architecture

### Frontend (src/)

React 19 SPA built with Rsbuild (not Next.js). Uses wouter for client-side routing (not react-router). All dashboard routes are auth-gated via Convex/Clerk's `<Authenticated>` / `<Unauthenticated>` components in `src/router.tsx`.

- **Routing**: `src/router.tsx` — wouter `<Route>` / `<Switch>`, Next.js-style file layout under `src/app/` is purely organizational
- **Providers**: `src/providers/convex-provider.tsx` — wraps app in ClerkProvider + ConvexProviderWithClerk
- **UI components**: `src/components/ui/` — shadcn/ui components (do not edit manually, use `npx shadcn add <component>`)
- **Layout**: `src/components/layout/` — sidebar and topbar
- **Chat**: `src/components/chat/` — chat view, message rendering, tool call display
- **Path aliases**: `@/*` maps to `./src/*`, `@dash/shared` maps to `./src/shared/index.ts`

### Backend (convex/)

Convex handles database, auth, and serverless functions. All backend logic lives in `convex/`.

- **Schema**: `convex/schema.ts` — defines all tables (users, agentConfigs, sessions, messages, streamingState, mcpServers, skills, memories, contextPresets)
- **Auth pattern**: `convex/users.ts` exports `getCurrentUserOrThrow(ctx)` — used by all queries/mutations to get the authenticated user. Clerk JWT identity is resolved via `ctx.auth.getUserIdentity()`
- **Agent execution**: `convex/agent.ts` — `runAgent` is an `internalAction` (Node.js runtime via `"use node"`) that calls the Claude Agent SDK's `query()`. It streams responses and updates a `streamingState` table row. The client reads this reactively via `useQuery(api.sessions.getStreamingState)`
- **Streaming pattern**: `sessions.sendMessage` mutation saves the user message, resets streaming state, and schedules `agent.runAgent` via `ctx.scheduler.runAfter(0, ...)`. The agent action batches text updates (~100ms) and writes tool activity to `streamingState`. When done, `finishStreaming` saves the assistant message and clears streaming state.

### Key Data Flow

1. User sends message → `sessions.sendMessage` mutation
2. Mutation saves user message, resets `streamingState`, schedules `agent.runAgent`
3. `agent.runAgent` action streams Claude Agent SDK output, periodically writes to `streamingState`
4. Frontend reactively reads `streamingState` via `useQuery` (Convex subscription)
5. On completion, `finishStreaming` saves assistant message to `messages` table

## Conventions

- **Package manager**: bun
- **Formatter/linter**: Biome — 2-space indent, double quotes, semicolons, 100 char line width
- **Styling**: Tailwind CSS 4 with shadcn/ui. Dark mode supported via `.dark` class. Use `cn()` from `src/lib/utils.ts` for conditional classes
- **Environment variables**: Client-side env vars use `NEXT_PUBLIC_` prefix (passed through Rsbuild's `source.define`). See `.env.example` for all variables
- **Deployment**: Vercel (see `vercel.json`). Build command chains `@dash/shared` and `@dash/client` package builds (legacy monorepo; may be simplified)
