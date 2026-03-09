# Personal Dashboard — Product Requirements Document

## Overview

A personal web dashboard that serves as a centralized hub for managing and interacting with AI agents remotely. The first milestone focuses on building a fully configurable agent environment — think "OpenClaw-style" remote access to AI agents with full control over MCP servers, skills, memory, context, and sessions.

Future milestones will expand the dashboard with additional personal productivity features.

---

## Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Framework     | Next.js 14+ (App Router)          |
| Language      | TypeScript                        |
| Styling       | Tailwind CSS + shadcn/ui          |
| Database      | Supabase (PostgreSQL)             |
| Auth          | Supabase Auth                     |
| Realtime      | Supabase Realtime (for live agent sessions) |
| Storage       | Supabase Storage (for agent artifacts/files) |
| Deployment    | TBD (Vercel / self-hosted)        |

---

## Milestone 1: AI Agent Environment Dashboard

### Core Features

#### 1. Authentication & User Management
- Login/signup via Supabase Auth (email + OAuth providers)
- Protected routes — all dashboard pages require auth
- User profile/settings page

#### 2. Agent Sessions
- **Session list** — view all past and active agent sessions
- **Create new session** — spin up a new agent conversation/task
- **Live session view** — real-time streaming of agent activity (messages, tool calls, outputs)
- **Session history** — browse past sessions with full message/tool-call logs
- **Session metadata** — name, tags, status (active/paused/completed), timestamps
- **Resume/fork sessions** — continue from where you left off or branch from a point

#### 3. Chat & Interaction Interface
- Real-time chat interface for conversing with the agent
- Streaming responses with markdown rendering
- Tool call visualization — see what tools the agent is invoking and their results
- File/image upload support within conversations
- Code block rendering with syntax highlighting

#### 4. MCP Server Configuration
- **MCP server registry** — add, remove, and configure MCP servers
- **Per-session MCP config** — choose which MCP servers are available per session
- **Server status monitoring** — see which servers are running, healthy, or errored
- **Server logs** — view stdout/stderr from MCP servers
- Configuration stored in Supabase, synced to agent runtime

#### 5. Skills Management
- **Skills library** — browse, create, edit, and delete agent skills (system prompts / instruction sets)
- **Skill templates** — pre-built skills for common tasks (code review, writing, research, etc.)
- **Skill assignment** — attach skills to sessions or set defaults
- **Skill versioning** — track changes to skills over time

#### 6. Memory & Context
- **Persistent memory store** — key-value or document-based memory the agent can read/write
- **Memory browser** — view, search, edit, and delete agent memories
- **Context window management** — see current context usage, manage what's included
- **Context presets** — pre-configured context bundles (e.g., "work projects", "personal notes")
- **File/document context** — upload and attach reference documents to sessions

#### 7. Agent Configuration
- **Model selection** — choose which LLM model powers the agent
- **System prompt editor** — edit the base system prompt
- **Temperature / parameter controls** — adjust generation parameters
- **Tool permissions** — control which tools the agent can use
- **Rate limiting / budget controls** — set token/cost limits per session

---

### Database Schema (Supabase)

```
users (managed by Supabase Auth)

profiles
  - id (uuid, FK -> auth.users)
  - display_name (text)
  - avatar_url (text)
  - settings (jsonb)
  - created_at, updated_at

agent_configs
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - name (text)
  - model (text)
  - system_prompt (text)
  - parameters (jsonb) -- temperature, max_tokens, etc.
  - tool_permissions (jsonb)
  - is_default (boolean)
  - created_at, updated_at

sessions
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - agent_config_id (uuid, FK -> agent_configs)
  - name (text)
  - status (enum: active, paused, completed, error)
  - tags (text[])
  - mcp_config (jsonb) -- which MCP servers are active
  - context_preset_id (uuid, nullable)
  - metadata (jsonb)
  - created_at, updated_at

messages
  - id (uuid, PK)
  - session_id (uuid, FK -> sessions)
  - role (enum: user, assistant, system, tool)
  - content (text)
  - tool_calls (jsonb, nullable)
  - tool_results (jsonb, nullable)
  - token_count (int)
  - created_at

mcp_servers
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - name (text)
  - type (text) -- stdio, sse, etc.
  - command (text)
  - args (text[])
  - env_vars (jsonb)
  - status (enum: active, inactive, error)
  - created_at, updated_at

skills
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - name (text)
  - description (text)
  - content (text) -- the actual skill/instruction text
  - category (text)
  - version (int)
  - is_template (boolean)
  - created_at, updated_at

memories
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - key (text)
  - value (text)
  - category (text)
  - embedding (vector, optional -- for semantic search)
  - created_at, updated_at

context_presets
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - name (text)
  - description (text)
  - included_memories (uuid[])
  - included_files (text[])
  - included_skills (uuid[])
  - created_at, updated_at
```

---

### Page Structure

```
/                         → Landing / redirect to dashboard
/login                    → Auth page
/dashboard                → Home — overview, recent sessions, quick actions
/dashboard/sessions       → Session list
/dashboard/sessions/[id]  → Live session / chat view
/dashboard/sessions/new   → Create new session (pick config, MCP, skills)
/dashboard/agents         → Agent configurations
/dashboard/agents/[id]    → Edit agent config
/dashboard/mcp            → MCP server management
/dashboard/skills         → Skills library
/dashboard/skills/[id]    → Edit skill
/dashboard/memory         → Memory browser
/dashboard/context        → Context presets
/dashboard/settings       → User settings & profile
```

---

### UI Layout

- **Sidebar navigation** — collapsible, with icons for each section
- **Top bar** — user avatar, notifications, quick search
- **Main content area** — responsive, card-based layouts
- **Session view** — split pane: chat on left, tool activity/context on right
- **Dark mode by default** (personal dashboard vibes)

---

## Future Milestones (Planned)

These will be scoped in separate PRDs when ready:

- **M2: Task Management** — personal kanban/todo system
- **M3: Notes & Knowledge Base** — markdown notes, wiki-style
- **M4: Integrations Hub** — GitHub, Calendar, Email, Slack connectors
- **M5: Automations** — scheduled agent tasks, triggers, workflows
- **M6: Analytics** — usage stats, token costs, session insights

---

## Implementation Plan (Milestone 1)

### Phase 1: Project Setup & Foundation
1. Initialize Next.js project with TypeScript
2. Configure Tailwind CSS + shadcn/ui
3. Set up Supabase project (auth, database, storage)
4. Create database schema & migrations
5. Set up authentication flow (login, signup, protected routes)
6. Build dashboard layout (sidebar, top bar, main content area)

### Phase 2: Core Agent Features
7. Build agent configuration CRUD (model, system prompt, params)
8. Build session management (create, list, view, resume)
9. Build chat interface with streaming responses
10. Implement tool call visualization
11. Add message history & session logs

### Phase 3: MCP & Skills
12. Build MCP server configuration UI
13. Build skills library CRUD
14. Implement skill assignment to sessions
15. Add skill templates

### Phase 4: Memory & Context
16. Build memory store CRUD + browser
17. Build context preset management
18. Implement file upload & document context
19. Context window usage visualization

### Phase 5: Polish & Deploy
20. Dark mode theming
21. Responsive design pass
22. Error handling & loading states
23. Deploy to hosting platform
