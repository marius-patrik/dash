import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "./providers/auth-provider";
import DashboardLayout from "./app/dashboard/layout";
import DashboardPage from "./app/dashboard/page";
import LoginPage from "./app/login/page";
import SessionsPage from "./app/dashboard/sessions/page";
import NewSessionPage from "./app/dashboard/sessions/new/page";
import SessionPage from "./app/dashboard/sessions/[id]/page";
import AgentsPage from "./app/dashboard/agents/page";
import EditAgentPage from "./app/dashboard/agents/[id]/page";
import McpPage from "./app/dashboard/mcp/page";
import SkillsPage from "./app/dashboard/skills/page";
import EditSkillPage from "./app/dashboard/skills/[id]/page";
import MemoryPage from "./app/dashboard/memory/page";
import ContextPresetsPage from "./app/dashboard/context/page";
import SettingsPage from "./app/dashboard/settings/page";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect href="/login" replace />;
  }

  return <>{children}</>;
}

function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/dashboard/sessions/new" component={NewSessionPage} />
          <Route path="/dashboard/sessions/:id" component={SessionPage} />
          <Route path="/dashboard/sessions" component={SessionsPage} />
          <Route path="/dashboard/agents/:id" component={EditAgentPage} />
          <Route path="/dashboard/agents" component={AgentsPage} />
          <Route path="/dashboard/mcp" component={McpPage} />
          <Route path="/dashboard/skills/:id" component={EditSkillPage} />
          <Route path="/dashboard/skills" component={SkillsPage} />
          <Route path="/dashboard/memory" component={MemoryPage} />
          <Route path="/dashboard/context" component={ContextPresetsPage} />
          <Route path="/dashboard/settings" component={SettingsPage} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route>
        <Redirect href="/dashboard" replace />
      </Route>
    </Switch>
  );
}
