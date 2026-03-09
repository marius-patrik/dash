
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { apiGet } from "@/lib/api";
import { ChatView } from "@/components/chat/chat-view";
import type { Session, Message } from "@dash/shared";
import { Badge } from "@/components/ui/badge";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ session: Session; messages: Message[] }>(
      `/api/sessions/${sessionId}`
    )
      .then((data) => {
        setSession(data.session);
        setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

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
        <Badge
          variant={session.status === "active" ? "default" : "secondary"}
        >
          {session.status}
        </Badge>
      </div>
      <div className="flex-1 min-h-0">
        <ChatView sessionId={sessionId} initialMessages={messages} />
      </div>
    </div>
  );
}
