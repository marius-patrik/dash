import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, GitFork, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { ChatView } from "@/components/chat/chat-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function SessionPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const sessionId = params.id as string;
  const session = useQuery(api.sessions.get, { id: sessionId as Id<"sessions"> });
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);

  async function handleFork() {
    if (!session) return;
    try {
      const forkedId = await createSession({
        name: `${session.name} (fork)`,
        agentConfigId: session.agentConfigId as Id<"agentConfigs">,
        mcpServerIds: session.mcpServerIds,
        skillIds: session.skillIds,
        tags: [...session.tags, "forked"],
      });
      toast.success("Session forked");
      navigate(`/dashboard/sessions/${forkedId}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleStatusChange(status: "active" | "paused" | "completed") {
    if (!session) return;
    try {
      await updateSession({ id: session._id, status });
      toast.success(`Session ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (session === undefined) {
    return <div className="text-muted-foreground">Loading session...</div>;
  }

  if (session === null) {
    return <div className="text-destructive">Session not found</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)]">
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-2">
        <h1 className="text-lg font-semibold">{session.name}</h1>
        <Badge variant={session.status === "active" ? "default" : "secondary"}>
          {session.status}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          {session.status === "paused" && (
            <Button variant="ghost" size="sm" onClick={() => handleStatusChange("active")}>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}
          {session.status === "active" && (
            <Button variant="ghost" size="sm" onClick={() => handleStatusChange("paused")}>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
          )}
          {session.status !== "completed" && (
            <Button variant="ghost" size="sm" onClick={() => handleStatusChange("completed")}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleFork}>
            <GitFork className="h-3 w-3 mr-1" />
            Fork
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatView sessionId={sessionId} />
      </div>
    </div>
  );
}
