
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Memory, CreateMemoryRequest } from "@dash/shared";
import { MEMORY_CATEGORIES } from "@dash/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Brain, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("other");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    apiGet<Memory[]>("/api/memory")
      .then(setMemories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setKey("");
    setValue("");
    setCategory("other");
    setEditingId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiPatch(`/api/memory/${editingId}`, { key, value, category });
        setMemories((prev) =>
          prev.map((m) =>
            m.id === editingId ? { ...m, key, value, category } : m
          )
        );
        toast.success("Memory updated");
      } else {
        const mem = await apiPost<Memory>("/api/memory", {
          key,
          value,
          category,
        } satisfies CreateMemoryRequest);
        setMemories((prev) => [...prev, mem]);
        toast.success("Memory added");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleEdit(mem: Memory) {
    setEditingId(mem.id);
    setKey(mem.key);
    setValue(mem.value);
    setCategory(mem.category);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/memory/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Memory deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const filtered = searchQuery
    ? memories.filter(
        (m) =>
          m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : memories;

  // Group by category
  const grouped = filtered.reduce(
    (acc, mem) => {
      const cat = mem.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mem);
      return acc;
    },
    {} as Record<string, Memory[]>
  );

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Memory</h1>
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
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Memory" : "Add Memory"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g., preferred_language"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g., TypeScript"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Add"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search memories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2" />
            <p>
              {searchQuery
                ? "No memories match your search"
                : "No memories yet. Add persistent context for your agent."}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, mems]) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {cat}
            </h2>
            {mems.map((mem) => (
              <Card key={mem.id}>
                <CardContent className="flex items-start justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mem.key}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {mem.value}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(mem)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(mem.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
