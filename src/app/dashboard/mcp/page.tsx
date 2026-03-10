import { useMutation, useQuery } from "convex/react";
import { Plus, Power, PowerOff, Server, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export default function McpPage() {
  const servers = useQuery(api.mcp.list);
  const createServer = useMutation(api.mcp.create);
  const updateServer = useMutation(api.mcp.update);
  const removeServer = useMutation(api.mcp.remove);

  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [envVars, setEnvVars] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const envObj: Record<string, string> = {};
      if (envVars.trim()) {
        for (const line of envVars.split("\n")) {
          const [key, ...rest] = line.split("=");
          if (key?.trim()) envObj[key.trim()] = rest.join("=").trim();
        }
      }

      await createServer({
        name,
        type: "stdio",
        command,
        args: args.split(" ").filter(Boolean),
        envVars: envObj,
      });

      setDialogOpen(false);
      setName("");
      setCommand("");
      setArgs("");
      setEnvVars("");
      toast.success("MCP server added");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function toggleStatus(server: Doc<"mcpServers">) {
    const newStatus = server.status === "active" ? "inactive" : "active";
    try {
      await updateServer({ id: server._id, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: Id<"mcpServers">) {
    try {
      await removeServer({ id });
      toast.success("MCP server removed");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (servers === undefined) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add MCP Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., filesystem"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Command</Label>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g., npx"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Arguments (space-separated)</Label>
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem /home"
                />
              </div>
              <div className="space-y-2">
                <Label>Environment Variables (KEY=VALUE, one per line)</Label>
                <Input
                  value={envVars}
                  onChange={(e) => setEnvVars(e.target.value)}
                  placeholder="e.g., API_KEY=abc123"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Server
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2" />
            <p>No MCP servers configured. Add one to enable agent tools.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <Card key={server._id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{server.name}</CardTitle>
                  <Badge
                    variant={server.status === "active" ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {server.status}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleStatus(server)}
                  >
                    {server.status === "active" ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(server._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <code className="text-xs text-muted-foreground">
                  {server.command} {server.args.join(" ")}
                </code>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
