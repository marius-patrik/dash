import type { WsClientMessage, WsServerMessage } from "@dash/shared";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { config } from "../config";
import { getSupabaseAdmin } from "../db/supabase";
import { runAgentQuery } from "../services/agent";

// Track active queries so we can abort them
const activeQueries = new Map<string, AbortController>();

async function fetchSessionConfig(sessionId: string, userId: string) {
  const supabase = getSupabaseAdmin();

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) throw new Error("Session not found");

  // Fetch agent config
  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("id", session.agent_config_id)
    .single();

  if (!agentConfig) throw new Error("Agent config not found");

  // Fetch MCP servers for this session
  const { data: mcpServers } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("user_id", userId)
    .in("id", session.mcp_server_ids || []);

  // Fetch skills for this session
  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", userId)
    .in("id", session.skill_ids || []);

  // Fetch all memories for context
  const { data: memories } = await supabase.from("memories").select("*").eq("user_id", userId);

  return {
    session,
    agentConfig,
    mcpServers: mcpServers || [],
    skills: skills || [],
    memories: memories || [],
  };
}

async function saveMessage(
  sessionId: string,
  role: string,
  content: string,
  toolCalls?: any,
  costUsd?: number,
) {
  if (!config.hasSupabase) return;

  const supabase = getSupabaseAdmin();
  await supabase.from("messages").insert({
    session_id: sessionId,
    role,
    content,
    tool_calls: toolCalls || null,
    cost_usd: costUsd || null,
  });
}

function send(ws: WebSocket, msg: WsServerMessage) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function registerChatWebSocket(app: FastifyInstance) {
  app.get("/ws/chat", { websocket: true }, (socket, req) => {
    const ws = socket as unknown as WebSocket;
    const userId = (req as any).userId || "dev-user";

    ws.on("message", async (raw: Buffer) => {
      let msg: WsClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      switch (msg.type) {
        case "chat": {
          const { session_id, content } = msg;

          // Abort any existing query for this session
          const existing = activeQueries.get(session_id);
          if (existing) existing.abort();

          const abortController = new AbortController();
          activeQueries.set(session_id, abortController);

          try {
            // Save user message
            await saveMessage(session_id, "user", content);

            // Fetch session config from Supabase
            let sessionConfig;
            if (config.hasSupabase) {
              sessionConfig = await fetchSessionConfig(session_id, userId);
            } else {
              // Dev mode — use defaults
              sessionConfig = {
                session: { agent_session_id: null },
                agentConfig: {
                  id: "dev",
                  user_id: userId,
                  name: "Default",
                  model: "claude-sonnet-4-6",
                  system_prompt: "You are a helpful assistant.",
                  parameters: {},
                  tool_permissions: { permission_mode: "acceptEdits" as const },
                  is_default: true,
                  created_at: "",
                  updated_at: "",
                },
                mcpServers: [],
                skills: [],
                memories: [],
              };
            }

            const { agentSessionId, costUsd } = await runAgentQuery({
              prompt: content,
              agentConfig: sessionConfig.agentConfig,
              mcpServers: sessionConfig.mcpServers,
              skills: sessionConfig.skills,
              memories: sessionConfig.memories,
              sessionId: sessionConfig.session.agent_session_id || undefined,
              onMessage: (wsMsg) => send(ws, wsMsg),
              signal: abortController.signal,
            });

            // Update session with agent session ID
            if (config.hasSupabase && agentSessionId) {
              const supabase = getSupabaseAdmin();
              await supabase
                .from("sessions")
                .update({ agent_session_id: agentSessionId })
                .eq("id", session_id);
            }
          } catch (err: any) {
            send(ws, { type: "error", message: err.message });
          } finally {
            activeQueries.delete(session_id);
          }
          break;
        }

        case "abort": {
          const controller = activeQueries.get(msg.session_id);
          if (controller) {
            controller.abort();
            activeQueries.delete(msg.session_id);
            send(ws, {
              type: "status",
              session_status: "paused",
            });
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      // Abort all queries for this connection
      for (const [id, controller] of activeQueries) {
        controller.abort();
        activeQueries.delete(id);
      }
    });
  });
}
