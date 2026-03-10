import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { Authenticated, ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { type ReactNode, useEffect } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function EnsureUser() {
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    ensureUser().catch(() => {});
  }, [ensureUser]);

  return null;
}

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Authenticated>
          <EnsureUser />
        </Authenticated>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
