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
      ? new Map(
          Object.entries(stream.activeTools as Record<string, { name: string; input: string }>),
        )
      : new Map<string, { name: string; input: string }>(),
    isStreaming: stream?.isStreaming ?? false,
    error: stream?.error ?? null,
    lastCostUsd: stream?.costUsd ?? null,
    sendMessage: (content: string) => sendMessageMutation({ sessionId: typedSessionId, content }),
    abort: () => cancelMutation({ sessionId: typedSessionId }),
    connect: () => {},
    disconnect: () => {},
    setMessages: () => {},
  };
}
