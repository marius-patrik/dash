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
        <Route path="/sessions/new" component={NewSessionPage} />
        <Route path="/sessions/:id" component={SessionPage} />
        <Route path="/sessions" component={SessionsPage} />
        <Route path="/agents/:id" component={EditAgentPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/mcp" component={McpPage} />
        <Route path="/skills/:id" component={EditSkillPage} />
        <Route path="/skills" component={SkillsPage} />
        <Route path="/memory" component={MemoryPage} />
        <Route path="/context" component={ContextPresetsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/" component={DashboardPage} />
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

  return (
    <Switch>
      <Route path="/dashboard/:rest*" nest>
        <DashboardRoutes />
      </Route>
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route>
        <Redirect href="/dashboard" replace />
      </Route>
    </Switch>
  );
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
