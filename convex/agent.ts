"use node";

import { query } from "@anthropic-ai/claude-agent-sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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
              for (const tool of Object.values(activeTools)) {
                tool.input += event.delta.partial_json;
              }
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
