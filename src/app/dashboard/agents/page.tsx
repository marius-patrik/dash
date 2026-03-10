import type { AgentConfig, CreateAgentConfigRequest } from "@dash/shared";
import { AVAILABLE_MODELS } from "@dash/shared";
import { Bot, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

export default function AgentsPage() {
  const [, navigate] = useLocation();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState(AVAILABLE_MODELS[1].id);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    apiGet<AgentConfig[]>("/api/agents")
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const agent = await apiPost<AgentConfig>("/api/agents", {
        name,
        model,
        system_prompt: systemPrompt,
      } satisfies CreateAgentConfigRequest);
      setAgents((prev) => [agent, ...prev]);
      setDialogOpen(false);
      setName("");
      setSystemPrompt("");
      toast.success("Agent config created");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/agents/${id}`);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agent config deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Configurations</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Agent Config
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Agent Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Coding Assistant"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} — {m.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-2" />
            <p>No agent configs yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {agent.model}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {agent.is_default && (
                    <Badge variant="default" className="text-xs">
                      default
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(agent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.system_prompt || "No system prompt"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                >
                  Edit Configuration
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
