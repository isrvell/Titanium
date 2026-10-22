import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/layouts/app-layout";
import { ProtectedRoute } from "@/layouts/protected-route";
import { GuestRoute } from "@/layouts/guest-route";
import { Spinner } from "@/components/ui/spinner";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/login").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("@/pages/signup").then((m) => ({ default: m.SignupPage })));
const HomePage = lazy(() => import("@/pages/home").then((m) => ({ default: m.HomePage })));
const InboxPage = lazy(() => import("@/pages/inbox").then((m) => ({ default: m.InboxPage })));
const MyTasksPage = lazy(() => import("@/pages/my-tasks").then((m) => ({ default: m.MyTasksPage })));
const FavoritesPage = lazy(() => import("@/pages/favorites").then((m) => ({ default: m.FavoritesPage })));
const NotificationsPage = lazy(() => import("@/pages/notifications").then((m) => ({ default: m.NotificationsPage })));
const OverviewPage = lazy(() => import("@/pages/overview").then((m) => ({ default: m.OverviewPage })));
const ProjectsPage = lazy(() => import("@/pages/projects").then((m) => ({ default: m.ProjectsPage })));
const TasksPage = lazy(() => import("@/pages/tasks").then((m) => ({ default: m.TasksPage })));
const CalendarPage = lazy(() => import("@/pages/calendar").then((m) => ({ default: m.CalendarPage })));
const TimelinePage = lazy(() => import("@/pages/timeline").then((m) => ({ default: m.TimelinePage })));
const MembersPage = lazy(() => import("@/pages/members").then((m) => ({ default: m.MembersPage })));
const ActivityPage = lazy(() => import("@/pages/activity").then((m) => ({ default: m.ActivityPage })));
const SearchPage = lazy(() => import("@/pages/search").then((m) => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <SuspensePage><LoginPage /></SuspensePage> },
      { path: "/signup", element: <SuspensePage><SignupPage /></SuspensePage> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <SuspensePage><HomePage /></SuspensePage> },
          { path: "/inbox", element: <SuspensePage><InboxPage /></SuspensePage> },
          { path: "/my-tasks", element: <SuspensePage><MyTasksPage /></SuspensePage> },
          { path: "/favorites", element: <SuspensePage><FavoritesPage /></SuspensePage> },
          { path: "/notifications", element: <SuspensePage><NotificationsPage /></SuspensePage> },
          { path: "/overview", element: <SuspensePage><OverviewPage /></SuspensePage> },
          { path: "/projects", element: <SuspensePage><ProjectsPage /></SuspensePage> },
          { path: "/tasks", element: <SuspensePage><TasksPage /></SuspensePage> },
          { path: "/calendar", element: <SuspensePage><CalendarPage /></SuspensePage> },
          { path: "/timeline", element: <SuspensePage><TimelinePage /></SuspensePage> },
          { path: "/members", element: <SuspensePage><MembersPage /></SuspensePage> },
          { path: "/activity", element: <SuspensePage><ActivityPage /></SuspensePage> },
          { path: "/search", element: <SuspensePage><SearchPage /></SuspensePage> },
          { path: "/settings", element: <SuspensePage><SettingsPage /></SuspensePage> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
