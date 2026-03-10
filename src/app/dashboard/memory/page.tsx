import { useMutation, useQuery } from "convex/react";
import { Brain, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { MEMORY_CATEGORIES } from "@/lib/constants";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function MemoryPage() {
  const memories = useQuery(api.memory.list);
  const createMemory = useMutation(api.memory.create);
  const updateMemory = useMutation(api.memory.update);
  const deleteMemory = useMutation(api.memory.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"memories"> | null>(null);

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("other");
  const [searchQuery, setSearchQuery] = useState("");

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
        await updateMemory({ id: editingId, key, value, category });
        toast.success("Memory updated");
      } else {
        await createMemory({ key, value, category });
        toast.success("Memory added");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleEdit(mem: (typeof filteredMemories)[number]) {
    setEditingId(mem._id);
    setKey(mem.key);
    setValue(mem.value);
    setCategory(mem.category);
    setDialogOpen(true);
  }

  async function handleDelete(id: Id<"memories">) {
    try {
      await deleteMemory({ id });
      toast.success("Memory deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (memories === undefined) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const filteredMemories = searchQuery
    ? memories.filter(
        (m) =>
          m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.value.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memories;

  // Group by category
  const grouped = filteredMemories.reduce(
    (acc, mem) => {
      const cat = mem.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mem);
      return acc;
    },
    {} as Record<string, typeof filteredMemories>,
  );

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
              <DialogTitle>{editingId ? "Edit Memory" : "Add Memory"}</DialogTitle>
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
              <Card key={mem._id}>
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
                      onClick={() => handleDelete(mem._id)}
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
