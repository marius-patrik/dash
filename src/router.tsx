import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { Redirect, Route, Switch } from "wouter";
import { api } from "../convex/_generated/api";
import EditAgentPage from "./app/dashboard/agents/[id]/page";
import AgentsPage from "./app/dashboard/agents/page";
import ContextPresetsPage from "./app/dashboard/context/page";
import DashboardLayout from "./app/dashboard/layout";
import McpPage from "./app/dashboard/mcp/page";
import MemoryPage from "./app/dashboard/memory/page";
import DashboardPage from "./app/dashboard/page";
import SessionPage from "./app/dashboard/sessions/[id]/page";
import NewSessionPage from "./app/dashboard/sessions/new/page";
import SessionsPage from "./app/dashboard/sessions/page";
import SettingsPage from "./app/dashboard/settings/page";
import EditSkillPage from "./app/dashboard/skills/[id]/page";
import SkillsPage from "./app/dashboard/skills/page";
import LoginPage from "./app/login/page";

function DashboardRoutes() {
  return (
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
  );
}

function AuthenticatedApp() {
  const ensureUser = useMutation(api.users.ensureUser);
  const user = useQuery(api.users.current);

  useEffect(() => {
    ensureUser().catch(() => {});
  }, [ensureUser]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Setting up your account...</div>
      </div>
    );
  }

  return <DashboardRoutes />;
}

export function AppRouter() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route>
            <Redirect href="/login" replace />
          </Route>
        </Switch>
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
    </>
  );
}
