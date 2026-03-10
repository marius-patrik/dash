import type { Message, Session } from "@dash/shared";
import { CheckCircle2, GitFork, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { ChatView } from "@/components/chat/chat-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export default function SessionPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ session: Session; messages: Message[] }>(`/api/sessions/${sessionId}`)
      .then((data) => {
        setSession(data.session);
        setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleFork() {
    if (!session) return;
    try {
      const forked = await apiPost<Session>("/api/sessions", {
        name: `${session.name} (fork)`,
        agent_config_id: session.agent_config_id,
        mcp_server_ids: session.mcp_server_ids,
        skill_ids: session.skill_ids,
        tags: [...session.tags, "forked"],
      });
      toast.success("Session forked");
      navigate(`/dashboard/sessions/${forked.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleStatusChange(status: "active" | "paused" | "completed") {
    if (!session) return;
    try {
      await apiPatch(`/api/sessions/${sessionId}`, { status });
      setSession({ ...session, status });
      toast.success(`Session ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading session...</div>;
  }

  if (!session) {
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
        <ChatView sessionId={sessionId} initialMessages={messages} />
      </div>
    </div>
  );
}
