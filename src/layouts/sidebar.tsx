import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";
import { NavLink } from "react-router-dom";
import {
  House,
  Inbox,
  CircleCheck,
  Star,
  Bell,
  Search,
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Calendar,
  ChartGantt,
  Users,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: House, label: "Home" },
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/my-tasks", icon: CircleCheck, label: "My Tasks" },
  { to: "/favorites", icon: Star, label: "Favorites" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
] as const;

const WORKSPACE_ITEMS = [
  { to: "/overview", icon: LayoutDashboard, label: "Overview" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/tasks", icon: ListChecks, label: "Tasks" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/timeline", icon: ChartGantt, label: "Timeline" },
  { to: "/members", icon: Users, label: "Members" },
  { to: "/activity", icon: Activity, label: "Activity" },
] as const;

const BOTTOM_ITEMS = [
  { to: "/search", icon: Search, label: "Search" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70",
          collapsed && "justify-center px-2",
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-3 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            Gr8r Studio
          </span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
            collapsed && "mx-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        {/* Workspace section */}
        <div className="mt-4 flex flex-col gap-0.5">
          {!collapsed && (
            <span className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </span>
          )}
          {WORKSPACE_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom items */}
        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
          {BOTTOM_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
