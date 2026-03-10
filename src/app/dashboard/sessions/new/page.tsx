import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function NewSessionPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [agentConfigId, setAgentConfigId] = useState("");
  const [selectedMcp, setSelectedMcp] = useState<Id<"mcpServers">[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Id<"skills">[]>([]);
  const [loading, setLoading] = useState(false);

  const agents = useQuery(api.agents.list);
  const mcpServers = useQuery(api.mcp.list);
  const skills = useQuery(api.skills.list);
  const createSession = useMutation(api.sessions.create);

  // Auto-select default agent once agents load
  const defaultAgentId =
    agentConfigId || (agents ? (agents.find((a) => a.isDefault) || agents[0])?._id : undefined);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const selectedAgent = defaultAgentId || agentConfigId;
    if (!name.trim() || !selectedAgent) return;

    setLoading(true);
    try {
      const sessionId = await createSession({
        name: name.trim(),
        agentConfigId: selectedAgent as Id<"agentConfigs">,
        mcpServerIds: selectedMcp,
        skillIds: selectedSkills,
      });

      navigate(`/dashboard/sessions/${sessionId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem<T extends string>(id: T, list: T[], setList: (v: T[]) => void) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  if (agents === undefined || mcpServers === undefined || skills === undefined) {
    return <div className="text-muted-foreground">Loading...</div>;
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
              <Select
                value={agentConfigId || (defaultAgentId as string) || ""}
                onValueChange={(v) => v && setAgentConfigId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent config" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
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
                    key={server._id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMcp.includes(server._id)}
                      onChange={() => toggleItem(server._id, selectedMcp, setSelectedMcp)}
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
                    key={skill._id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill._id)}
                      onChange={() => toggleItem(skill._id, selectedSkills, setSelectedSkills)}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !(agentConfigId || defaultAgentId)}
        >
          {loading ? "Creating..." : "Create Session"}
        </Button>
      </form>
    </div>
  );
}
