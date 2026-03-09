import { Routes, Route, Navigate } from "react-router";
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/new" element={<NewSessionPage />} />
        <Route path="sessions/:id" element={<SessionPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<EditAgentPage />} />
        <Route path="mcp" element={<McpPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="skills/:id" element={<EditSkillPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
