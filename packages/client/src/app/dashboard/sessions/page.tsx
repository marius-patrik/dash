
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet, apiDelete } from "@/lib/api";
import type { Session } from "@dash/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Session[]>("/api/sessions")
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link to="/dashboard/sessions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p>No sessions yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <Link
                  to={`/dashboard/sessions/${session.id}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updated_at).toLocaleString()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {session.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <Badge
                    variant={
                      session.status === "active" ? "default" : "secondary"
                    }
                  >
                    {session.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
