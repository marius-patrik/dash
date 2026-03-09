"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import type { AgentConfig, McpServer, Skill, CreateSessionRequest } from "@dash/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agentConfigId, setAgentConfigId] = useState("");
  const [selectedMcp, setSelectedMcp] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<AgentConfig[]>("/api/agents").catch(() => []),
      apiGet<McpServer[]>("/api/mcp").catch(() => []),
      apiGet<Skill[]>("/api/skills").catch(() => []),
    ]).then(([a, m, s]) => {
      setAgents(a);
      setMcpServers(m);
      setSkills(s);
      // Auto-select default agent
      const defaultAgent = a.find((ag) => ag.is_default) || a[0];
      if (defaultAgent) setAgentConfigId(defaultAgent.id);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !agentConfigId) return;

    setLoading(true);
    try {
      const session = await apiPost<{ id: string }>("/api/sessions", {
        name: name.trim(),
        agent_config_id: agentConfigId,
        mcp_server_ids: selectedMcp,
        skill_ids: selectedSkills,
      } satisfies CreateSessionRequest);

      router.push(`/dashboard/sessions/${session.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Session</h1>

      <form onSubmit={handleCreate} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Debug auth flow"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Agent Configuration</Label>
              <Select value={agentConfigId} onValueChange={(v) => v && setAgentConfigId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent config" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agents.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No agent configs yet. Create one in the Agents page first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {mcpServers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MCP Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mcpServers.map((server) => (
                  <label
                    key={server.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMcp.includes(server.id)}
                      onChange={() =>
                        toggleItem(server.id, selectedMcp, setSelectedMcp)
                      }
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{server.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {server.command} {server.args.join(" ")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() =>
                        toggleItem(skill.id, selectedSkills, setSelectedSkills)
                      }
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {skill.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={loading || !agentConfigId}>
          {loading ? "Creating..." : "Create Session"}
        </Button>
      </form>
    </div>
  );
}
