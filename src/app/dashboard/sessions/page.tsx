import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function SessionsPage() {
  const [, navigate] = useLocation();
  const sessions = useQuery(api.sessions.list);
  const removeSession = useMutation(api.sessions.remove);

  async function handleDelete(id: Id<"sessions">) {
    try {
      await removeSession({ id });
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  }

  if (sessions === undefined) {
    return <div className="text-muted-foreground">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Button onClick={() => navigate("/dashboard/sessions/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
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
            <Card key={session._id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <Link
                  href={`/dashboard/sessions/${session._id}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session._creationTime).toLocaleString()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {session.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant={session.status === "active" ? "default" : "secondary"}>
                    {session.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(session._id)}
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
