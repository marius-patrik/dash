"use client";

import type { Message, WsServerMessage } from "@dash/shared";
import { useCallback, useRef, useState } from "react";
import { createChatSocket } from "@/lib/ws";

interface ChatState {
  messages: Message[];
  streamingText: string;
  activeTools: Map<string, { name: string; input: string }>;
  isStreaming: boolean;
  error: string | null;
  lastCostUsd: number | null;
}

export function useChat(sessionId: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    streamingText: "",
    activeTools: new Map(),
    isStreaming: false,
    error: null,
    lastCostUsd: null,
  });

  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    socketRef.current = createChatSocket(
      (msg: WsServerMessage) => {
        setState((prev) => {
          switch (msg.type) {
            case "stream_text":
              return { ...prev, streamingText: prev.streamingText + msg.text };

            case "stream_tool_start": {
              const tools = new Map(prev.activeTools);
              tools.set(msg.tool_id, { name: msg.tool_name, input: "" });
              return { ...prev, activeTools: tools };
            }

            case "stream_tool_input": {
              const tools = new Map(prev.activeTools);
              const tool = tools.get(msg.tool_id);
              if (tool) {
                tools.set(msg.tool_id, {
                  ...tool,
                  input: tool.input + msg.partial_json,
                });
              }
              return { ...prev, activeTools: tools };
            }

            case "stream_tool_end": {
              const tools = new Map(prev.activeTools);
              tools.delete(msg.tool_id);
              return { ...prev, activeTools: tools };
            }

            case "assistant_message":
              return {
                ...prev,
                messages: [...prev.messages, msg.message],
                streamingText: "",
                activeTools: new Map(),
              };

            case "result":
              return {
                ...prev,
                isStreaming: false,
                lastCostUsd: msg.cost_usd,
                streamingText: "",
                activeTools: new Map(),
              };

            case "error":
              return {
                ...prev,
                isStreaming: false,
                error: msg.message,
                streamingText: "",
              };

            default:
              return prev;
          }
        });
      },
      () => {
        socketRef.current = null;
      },
    );
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current) connect();

      // Add user message optimistically
      const userMessage: Message = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: "user",
        content,
        tool_calls: null,
        tool_results: null,
        token_count: null,
        cost_usd: null,
        created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isStreaming: true,
        error: null,
        streamingText: "",
      }));

      socketRef.current?.send({
        type: "chat",
        session_id: sessionId,
        content,
      });
    },
    [sessionId, connect],
  );

  const abort = useCallback(() => {
    socketRef.current?.send({ type: "abort", session_id: sessionId });
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, [sessionId]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const setMessages = useCallback((messages: Message[]) => {
    setState((prev) => ({ ...prev, messages }));
  }, []);

  return {
    ...state,
    sendMessage,
    abort,
    connect,
    disconnect,
    setMessages,
  };
}
