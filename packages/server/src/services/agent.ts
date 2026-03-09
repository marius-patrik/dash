import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  AgentConfig,
  McpServer,
  Skill,
  Memory,
  WsServerMessage,
} from "@dash/shared";

interface AgentQueryOptions {
  prompt: string;
  agentConfig: AgentConfig;
  mcpServers: McpServer[];
  skills: Skill[];
  memories: Memory[];
  sessionId?: string; // Agent SDK session ID to resume
  onMessage: (msg: WsServerMessage) => void;
  signal?: AbortSignal;
}

function assembleSystemPrompt(
  agentConfig: AgentConfig,
  skills: Skill[],
  memories: Memory[]
): string {
  const parts: string[] = [];

  // Base system prompt from agent config
  if (agentConfig.system_prompt) {
    parts.push(agentConfig.system_prompt);
  }

  // Append skills
  if (skills.length > 0) {
    parts.push("\n--- Active Skills ---");
    for (const skill of skills) {
      parts.push(`\n## ${skill.name}\n${skill.content}`);
    }
  }

  // Append memories as context
  if (memories.length > 0) {
    parts.push("\n--- Persistent Memory ---");
    for (const mem of memories) {
      parts.push(`- ${mem.key}: ${mem.value}`);
    }
  }

  return parts.join("\n");
}

function buildMcpServersConfig(
  mcpServers: McpServer[]
): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
  const config: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};

  for (const server of mcpServers) {
    if (server.status !== "active") continue;
    config[server.name] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env_vars).length > 0 && { env: server.env_vars }),
    };
  }

  return config;
}

export async function runAgentQuery(options: AgentQueryOptions): Promise<{
  agentSessionId: string;
  costUsd: number;
}> {
  const {
    prompt,
    agentConfig,
    mcpServers,
    skills,
    memories,
    sessionId,
    onMessage,
    signal,
  } = options;

  const systemPrompt = assembleSystemPrompt(agentConfig, skills, memories);
  const mcpConfig = buildMcpServersConfig(mcpServers);

  let agentSessionId = sessionId || "";
  let totalCost = 0;

  const queryOptions: Record<string, unknown> = {
    systemPrompt,
    includePartialMessages: true,
    model: agentConfig.model || undefined,
    maxTurns: agentConfig.parameters?.max_turns,
    maxBudgetUsd: agentConfig.parameters?.max_budget_usd,
    effort: agentConfig.parameters?.effort,
    allowedTools: agentConfig.tool_permissions?.allowed_tools,
    disallowedTools: agentConfig.tool_permissions?.disallowed_tools,
    permissionMode: agentConfig.tool_permissions?.permission_mode || "acceptEdits",
  };

  // Add MCP servers if configured
  if (Object.keys(mcpConfig).length > 0) {
    queryOptions.mcpServers = mcpConfig;
  }

  // Resume existing session if provided
  if (sessionId) {
    queryOptions.resume = sessionId;
  }

  try {
    for await (const message of query({
      prompt,
      options: queryOptions as any,
    })) {
      // Check for abort
      if (signal?.aborted) break;

      switch (message.type) {
        case "system":
          if (message.subtype === "init" && message.session_id) {
            agentSessionId = message.session_id;
          }
          break;

        case "stream_event": {
          const event = message.event as any;

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta"
          ) {
            onMessage({ type: "stream_text", text: event.delta.text });
          }

          if (
            event.type === "content_block_start" &&
            event.content_block?.type === "tool_use"
          ) {
            onMessage({
              type: "stream_tool_start",
              tool_name: event.content_block.name,
              tool_id: event.content_block.id,
            });
          }

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "input_json_delta"
          ) {
            onMessage({
              type: "stream_tool_input",
              tool_id: "", // filled from context
              partial_json: event.delta.partial_json,
            });
          }

          if (event.type === "content_block_stop") {
            // Could be end of tool or text
          }
          break;
        }

        case "assistant": {
          // Complete assistant response — extract text and tool calls
          const content = (message as any).message?.content;
          if (content) {
            const textParts: string[] = [];
            const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

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

            onMessage({
              type: "assistant_message",
              message: {
                id: crypto.randomUUID(),
                session_id: "",
                role: "assistant",
                content: textParts.join(""),
                tool_calls: toolCalls.length > 0 ? toolCalls : null,
                tool_results: null,
                token_count: null,
                cost_usd: null,
                created_at: new Date().toISOString(),
              },
            });
          }
          break;
        }

        case "result": {
          totalCost = (message as any).total_cost_usd || 0;
          const output = (message as any).result || "";

          onMessage({
            type: "result",
            output,
            cost_usd: totalCost,
            session_id: agentSessionId,
          });
          break;
        }
      }
    }
  } catch (err: any) {
    onMessage({
      type: "error",
      message: err.message || "Agent query failed",
    });
  }

  return { agentSessionId, costUsd: totalCost };
}
