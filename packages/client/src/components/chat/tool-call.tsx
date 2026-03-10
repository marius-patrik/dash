import type { ToolCallData, ToolResultData } from "@dash/shared";
import { CheckCircle2, ChevronDown, ChevronRight, Wrench, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function ToolCallView({
  toolCall,
  result,
}: {
  toolCall: ToolCallData;
  result?: ToolResultData;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full rounded-md border border-border bg-card text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-xs">
          {toolCall.name}
        </Badge>
        {result &&
          (result.is_error ? (
            <XCircle className="h-3 w-3 text-destructive ml-auto" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
          ))}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-2">
          <div>
            <span className="text-xs text-muted-foreground">Input</span>
            <pre className="overflow-x-auto text-xs mt-1 p-2 rounded bg-muted">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <span className="text-xs text-muted-foreground">
                {result.is_error ? "Error" : "Output"}
              </span>
              <pre
                className={`overflow-x-auto text-xs mt-1 p-2 rounded max-h-40 overflow-y-auto ${
                  result.is_error ? "bg-destructive/10 text-destructive" : "bg-muted"
                }`}
              >
                {result.content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StreamingToolCall({ name, input }: { name: string; input: string }) {
  return (
    <div className="w-full rounded-md border border-border bg-card text-sm animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2">
        <Wrench className="h-3 w-3 text-muted-foreground animate-spin" />
        <Badge variant="outline" className="text-xs">
          {name}
        </Badge>
        <span className="text-xs text-muted-foreground">running...</span>
      </div>
      {input && (
        <div className="px-3 pb-2">
          <pre className="overflow-x-auto text-xs p-2 rounded bg-muted">{input}</pre>
        </div>
      )}
    </div>
  );
}
