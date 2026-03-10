import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
                {(user?.firstName ||
                  user?.primaryEmailAddress?.emailAddress ||
                  "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                Managed by Clerk. Update your profile at{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => user?.update && window.open("https://accounts.clerk.dev")}
                >
                  your account settings
                </Button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">
              {user?.primaryEmailAddress?.emailAddress || "Not signed in"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">User ID</span>
            <code className="text-xs text-muted-foreground">{user?.id || "—"}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
