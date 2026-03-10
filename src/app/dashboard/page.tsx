import type { AgentConfig, McpServer, Session } from "@/shared";
import { Bot, MessageSquare, Plus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<Session[]>("/api/sessions").catch(() => []),
      apiGet<AgentConfig[]>("/api/agents").catch(() => []),
      apiGet<McpServer[]>("/api/mcp").catch(() => []),
    ]).then(([s, a, m]) => {
      setSessions(s);
      setAgents(a);
      setMcpServers(m);
    });
  }, []);

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => navigate("/dashboard/sessions/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sessions
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agent Configs
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MCP Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mcpServers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet.{" "}
              <Link href="/dashboard/sessions/new" className="text-primary hover:underline">
                Create your first session
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/sessions/${session.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{session.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={session.status === "active" ? "default" : "secondary"}>
                      {session.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
