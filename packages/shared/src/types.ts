// ============================================
// Database types (mirror Supabase schema)
// ============================================

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  user_id: string;
  name: string;
  model: string;
  system_prompt: string;
  parameters: AgentParameters;
  tool_permissions: ToolPermissions;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentParameters {
  temperature?: number;
  max_tokens?: number;
  max_turns?: number;
  max_budget_usd?: number;
  effort?: "low" | "medium" | "high" | "max";
}

export interface ToolPermissions {
  allowed_tools?: string[];
  disallowed_tools?: string[];
  permission_mode?: "default" | "acceptEdits" | "bypassPermissions";
}

export interface Session {
  id: string;
  user_id: string;
  agent_config_id: string | null;
  agent_session_id: string | null; // Claude Agent SDK session ID
  name: string;
  status: SessionStatus;
  tags: string[];
  mcp_server_ids: string[]; // which MCP servers are active
  skill_ids: string[]; // which skills are attached
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = "active" | "paused" | "completed" | "error";

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  tool_calls: ToolCallData[] | null;
  tool_results: ToolResultData[] | null;
  token_count: number | null;
  cost_usd: number | null;
  created_at: string;
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCallData {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultData {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface McpServer {
  id: string;
  user_id: string;
  name: string;
  type: string; // stdio, sse, etc.
  command: string;
  args: string[];
  env_vars: Record<string, string>;
  status: McpServerStatus;
  created_at: string;
  updated_at: string;
}

export type McpServerStatus = "active" | "inactive" | "error";

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description: string;
  content: string; // the actual skill/instruction text
  category: string;
  version: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ContextPreset {
  id: string;
  user_id: string;
  name: string;
  description: string;
  included_memories: string[];
  included_files: string[];
  included_skills: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// WebSocket message types (client ↔ server)
// ============================================

export type WsClientMessage =
  | { type: "chat"; session_id: string; content: string }
  | { type: "abort"; session_id: string }
  | { type: "sync_config"; session_id: string };

export type WsServerMessage =
  | { type: "stream_text"; text: string }
  | { type: "stream_tool_start"; tool_name: string; tool_id: string }
  | { type: "stream_tool_input"; tool_id: string; partial_json: string }
  | { type: "stream_tool_end"; tool_id: string }
  | { type: "assistant_message"; message: Message }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error: boolean }
  | { type: "result"; output: string; cost_usd: number; session_id: string }
  | { type: "error"; message: string }
  | { type: "status"; session_status: SessionStatus };

// ============================================
// API request/response types
// ============================================

export interface CreateSessionRequest {
  name: string;
  agent_config_id: string;
  mcp_server_ids?: string[];
  skill_ids?: string[];
  tags?: string[];
}

export interface CreateAgentConfigRequest {
  name: string;
  model: string;
  system_prompt: string;
  parameters?: AgentParameters;
  tool_permissions?: ToolPermissions;
  is_default?: boolean;
}

export interface CreateMcpServerRequest {
  name: string;
  type: string;
  command: string;
  args?: string[];
  env_vars?: Record<string, string>;
}

export interface CreateSkillRequest {
  name: string;
  description: string;
  content: string;
  category?: string;
}

export interface CreateMemoryRequest {
  key: string;
  value: string;
  category?: string;
}
