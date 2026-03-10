import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignIn routing="hash" afterSignInUrl="/dashboard" />
    </div>
  );
}
