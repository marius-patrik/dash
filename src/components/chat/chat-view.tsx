import { Bot } from "lucide-react";
import { useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/hooks/use-chat";
import { ChatInput } from "./input";
import { ChatMessage } from "./message";
import { StreamingToolCall } from "./tool-call";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { messages, streamingText, activeTools, isStreaming, error, sendMessage, abort } =
    useChat(sessionId);

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-3xl mx-auto px-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bot className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Send a message to begin</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg._id} message={msg} />
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="flex gap-3 py-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg px-4 py-2 text-sm bg-muted max-w-[80%]">
                {streamingText}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          )}

          {/* Active tool calls */}
          {Array.from(activeTools.entries()).map(([id, tool]) => (
            <div key={id} className="ml-11 mb-2">
              <StreamingToolCall name={tool.name} input={tool.input} />
            </div>
          ))}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 mx-11 mb-4">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput onSend={sendMessage} onAbort={abort} isStreaming={isStreaming} />
    </div>
  );
}
