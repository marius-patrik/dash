import type { ContextPreset, Memory, Skill } from "@/shared";
import { Brain, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export default function ContextPresetsPage() {
  const [presets, setPresets] = useState<ContextPreset[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<ContextPreset[]>("/api/context-presets"),
      apiGet<Skill[]>("/api/skills"),
      apiGet<Memory[]>("/api/memory"),
    ])
      .then(([p, s, m]) => {
        setPresets(p);
        setSkills(s);
        setMemories(m);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedSkills([]);
    setSelectedMemories([]);
    setEditingId(null);
  }

  function openEdit(preset: ContextPreset) {
    setName(preset.name);
    setDescription(preset.description);
    setSelectedSkills(preset.included_skills);
    setSelectedMemories(preset.included_memories);
    setEditingId(preset.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        name,
        description,
        included_skills: selectedSkills,
        included_memories: selectedMemories,
        included_files: [],
      };

      if (editingId) {
        const updated = await apiPatch<ContextPreset>(`/api/context-presets/${editingId}`, body);
        setPresets((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success("Preset updated");
      } else {
        const created = await apiPost<ContextPreset>("/api/context-presets", body);
        setPresets((prev) => [created, ...prev]);
        toast.success("Preset created");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/context-presets/${id}`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success("Preset deleted");
    } catch {
      toast.error("Failed to delete preset");
    }
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Context Presets</h1>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Preset" : "Create Context Preset"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Coding Context"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this preset is for..."
                  rows={2}
                />
              </div>

              {skills.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Skills
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Badge
                        key={s.id}
                        variant={selectedSkills.includes(s.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleItem(selectedSkills, setSelectedSkills, s.id)}
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {memories.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Brain className="h-3 w-3" /> Memories
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {memories.map((m) => (
                      <Badge
                        key={m.id}
                        variant={selectedMemories.includes(m.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleItem(selectedMemories, setSelectedMemories, m.id)}
                      >
                        {m.key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {presets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2" />
            <p>No context presets yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(preset)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(preset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {preset.included_skills.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {preset.included_skills.length} skill
                      {preset.included_skills.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {preset.included_memories.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      {preset.included_memories.length} memor
                      {preset.included_memories.length !== 1 ? "ies" : "y"}
                    </Badge>
                  )}
                  {preset.included_skills.length === 0 && preset.included_memories.length === 0 && (
                    <span className="text-xs text-muted-foreground">Empty preset</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
