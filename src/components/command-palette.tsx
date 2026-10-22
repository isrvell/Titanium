import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaletteStore } from "@/stores/palette";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  House, Inbox, CircleCheck, Star, Bell, Search,
  LayoutDashboard, FolderKanban, ListChecks, Calendar,
  ChartGantt, Users, Activity, Settings, Sun, Moon, LogOut,
} from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import { signOut } from "@/lib/auth-client";

const NAV_ITEMS = [
  { to: "/", icon: House, label: "Home", group: "Navigation" },
  { to: "/inbox", icon: Inbox, label: "Inbox", group: "Navigation" },
  { to: "/my-tasks", icon: CircleCheck, label: "My Tasks", group: "Navigation" },
  { to: "/favorites", icon: Star, label: "Favorites", group: "Navigation" },
  { to: "/notifications", icon: Bell, label: "Notifications", group: "Navigation" },
  { to: "/overview", icon: LayoutDashboard, label: "Overview", group: "Workspace" },
  { to: "/projects", icon: FolderKanban, label: "Projects", group: "Workspace" },
  { to: "/tasks", icon: ListChecks, label: "Tasks", group: "Workspace" },
  { to: "/calendar", icon: Calendar, label: "Calendar", group: "Workspace" },
  { to: "/timeline", icon: ChartGantt, label: "Timeline", group: "Workspace" },
  { to: "/members", icon: Users, label: "Members", group: "Workspace" },
  { to: "/activity", icon: Activity, label: "Activity", group: "Workspace" },
  { to: "/search", icon: Search, label: "Search", group: "Workspace" },
  { to: "/settings", icon: Settings, label: "Settings", group: "Workspace" },
];

export function CommandPalette() {
  const { open, setOpen, toggle } = usePaletteStore();
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      toggle();
    }
  }, [toggle]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function runAction(fn: () => void) { fn(); setOpen(false); }
  function goTo(path: string) { runAction(() => navigate(path)); }

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/login");
  }

  const navGroups = NAV_ITEMS.reduce((acc, item) => {
    const group = acc[item.group] ?? [];
    group.push(item);
    acc[item.group] = group;
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(navGroups).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.to} onSelect={() => goTo(item.to)}>
                  <Icon /><span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runAction(() => setTheme("light"))}><Sun /><span>Light mode</span></CommandItem>
          <CommandItem onSelect={() => runAction(() => setTheme("dark"))}><Moon /><span>Dark mode</span></CommandItem>
          <CommandItem onSelect={() => runAction(() => setTheme("system"))}><Settings /><span>System theme</span></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem onSelect={handleSignOut}><LogOut /><span>Sign out</span></CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
