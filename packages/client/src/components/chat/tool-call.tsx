
import { useState } from "react";
import type { ToolCallData } from "@dash/shared";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

export function ToolCallView({ toolCall }: { toolCall: ToolCallData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full rounded-md border border-border bg-card text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-xs">
          {toolCall.name}
        </Badge>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border">
          <pre className="overflow-x-auto text-xs mt-2 p-2 rounded bg-muted">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function StreamingToolCall({
  name,
  input,
}: {
  name: string;
  input: string;
}) {
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
          <pre className="overflow-x-auto text-xs p-2 rounded bg-muted">
            {input}
          </pre>
        </div>
      )}
    </div>
  );
}
