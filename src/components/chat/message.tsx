import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ToolCallView } from "./tool-call";

export function ChatMessage({ message }: { message: Doc<"messages"> }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
          isUser ? "bg-primary" : "bg-muted",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn("flex flex-col max-w-[80%] space-y-2", isUser ? "items-end" : "items-start")}
      >
        {message.content && (
          <div
            className={cn(
              "rounded-lg px-4 py-2 text-sm",
              isUser ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => (
                  <pre className="overflow-x-auto rounded bg-background p-3 my-2 text-xs">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-background/50 rounded px-1 py-0.5 text-xs">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.toolCalls?.map((tc: any) => (
          <ToolCallView
            key={tc.id}
            toolCall={tc}
            result={message.toolResults?.find((r: any) => r.tool_use_id === tc.id)}
          />
        ))}
      </div>
    </div>
  );
}
