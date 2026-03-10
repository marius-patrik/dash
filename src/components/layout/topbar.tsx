import { useClerk, useUser } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const initials = user?.primaryEmailAddress?.emailAddress
    ? user.primaryEmailAddress.emailAddress.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button type="button" className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
            <Avatar className="h-8 w-8">
              {user?.imageUrl && <AvatarImage src={user.imageUrl} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress || "Not signed in"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
