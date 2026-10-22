import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@/components/command-palette";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { Spinner } from "@/components/ui/spinner";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Home",
  "/inbox": "Inbox",
  "/my-tasks": "My Tasks",
  "/favorites": "Favorites",
  "/notifications": "Notifications",
  "/overview": "Overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/timeline": "Timeline",
  "/members": "Members",
  "/activity": "Activity",
  "/search": "Search",
  "/settings": "Settings",
};

export function AppLayout() {
  const { pathname } = useLocation();
  const { workspace, loading } = useBootstrap();
  const title = ROUTE_TITLES[pathname] ?? "Gr8r Studio";

  if (loading && !workspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
