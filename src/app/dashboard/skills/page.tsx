import type { CreateSkillRequest, Skill } from "@dash/shared";
import { SKILL_CATEGORIES } from "@dash/shared";
import { Plus, Sparkles, Trash2 } from "lucide-react";
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

export default function SkillsPage() {
  const [, navigate] = useLocation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");

  useEffect(() => {
    apiGet<Skill[]>("/api/skills")
      .then(setSkills)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const skill = await apiPost<Skill>("/api/skills", {
        name,
        description,
        content,
        category,
      } satisfies CreateSkillRequest);
      setSkills((prev) => [...prev, skill]);
      setDialogOpen(false);
      setName("");
      setDescription("");
      setContent("");
      toast.success("Skill created");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/skills/${id}`);
      setSkills((prev) => prev.filter((s) => s.id !== id));
      toast.success("Skill deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skills</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Skill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Code Reviewer"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this skill does"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content (instructions for the agent)</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="You are an expert code reviewer..."
                  rows={6}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2" />
            <p>No skills yet. Create reusable instruction sets for your agent.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <Card key={skill.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {skill.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      v{skill.version}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(skill.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                  {skill.content}
                </p>
                <Button
                  variant="link"
                  className="px-0 mt-2 text-xs"
                  onClick={() => navigate(`/dashboard/skills/${skill.id}`)}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
