
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { apiGet, apiPatch } from "@/lib/api";
import type { AgentConfig } from "@dash/shared";
import { AVAILABLE_MODELS, BUILT_IN_TOOLS } from "@dash/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function EditAgentPage() {
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [maxTurns, setMaxTurns] = useState(25);
  const [maxBudget, setMaxBudget] = useState(5);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    apiGet<AgentConfig>(`/api/agents/${id}`)
      .then((a) => {
        setAgent(a);
        setName(a.name);
        setModel(a.model);
        setSystemPrompt(a.system_prompt);
        setMaxTurns(a.parameters?.max_turns || 25);
        setMaxBudget(a.parameters?.max_budget_usd || 5);
        setIsDefault(a.is_default);
      })
      .catch(() => toast.error("Failed to load agent config"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch(`/api/agents/${id}`, {
        name,
        model,
        system_prompt: systemPrompt,
        parameters: { max_turns: maxTurns, max_budget_usd: maxBudget },
        is_default: isDefault,
      });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!agent) return <div className="text-destructive">Not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/agents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Agent Config</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            <Label>Set as default</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Max Turns: {maxTurns}</Label>
            <Slider
              value={[maxTurns]}
              onValueChange={(v) => setMaxTurns(Array.isArray(v) ? v[0] : v)}
              min={1}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Budget (USD): ${maxBudget.toFixed(2)}</Label>
            <Slider
              value={[maxBudget]}
              onValueChange={(v) => setMaxBudget(Array.isArray(v) ? v[0] : v)}
              min={0.1}
              max={50}
              step={0.1}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
