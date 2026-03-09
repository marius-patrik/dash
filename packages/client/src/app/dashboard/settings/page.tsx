
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user?.email || "Not signed in"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">User ID</span>
            <code className="text-xs text-muted-foreground">
              {user?.id || "—"}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Server Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">API URL</span>
            <code className="text-xs">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">WebSocket</span>
            <code className="text-xs">
              {process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
