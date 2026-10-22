import { useThemeStore } from "@/stores/theme";
import { useSession, signOut } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, LogOut, Settings, User } from "lucide-react";
import type { Theme } from "@/types";

const THEME_ICONS: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar({ title }: { title: string }) {
  const { theme, setTheme } = useThemeStore();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const Icon = THEME_ICONS[theme];

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!;
    setTheme(next);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={`Theme: ${theme}`}
        >
          <Icon className="size-4" />
        </button>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full outline-none ring-ring focus-visible:ring-2" />
              }
            >
                <Avatar className="size-8">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {initials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <User />
                  Profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
