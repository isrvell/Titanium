import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/layouts/app-layout";
import { ProtectedRoute } from "@/layouts/protected-route";
import { GuestRoute } from "@/layouts/guest-route";
import { ErrorBoundary } from "@/components/error-boundary";
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
const ProjectDetailPage = lazy(() => import("@/pages/project-detail").then((m) => ({ default: m.ProjectDetailPage })));
const TasksPage = lazy(() => import("@/pages/tasks").then((m) => ({ default: m.TasksPage })));
const CalendarPage = lazy(() => import("@/pages/calendar").then((m) => ({ default: m.CalendarPage })));
const TimelinePage = lazy(() => import("@/pages/timeline").then((m) => ({ default: m.TimelinePage })));
const MembersPage = lazy(() => import("@/pages/members").then((m) => ({ default: m.MembersPage })));
const ActivityPage = lazy(() => import("@/pages/activity").then((m) => ({ default: m.ActivityPage })));
const SearchPage = lazy(() => import("@/pages/search").then((m) => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFoundPage })));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <S><LoginPage /></S> },
      { path: "/signup", element: <S><SignupPage /></S> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <S><HomePage /></S> },
          { path: "/inbox", element: <S><InboxPage /></S> },
          { path: "/my-tasks", element: <S><MyTasksPage /></S> },
          { path: "/favorites", element: <S><FavoritesPage /></S> },
          { path: "/notifications", element: <S><NotificationsPage /></S> },
          { path: "/overview", element: <S><OverviewPage /></S> },
          { path: "/projects", element: <S><ProjectsPage /></S> },
          { path: "/projects/:projectId", element: <S><ProjectDetailPage /></S> },
          { path: "/tasks", element: <S><TasksPage /></S> },
          { path: "/calendar", element: <S><CalendarPage /></S> },
          { path: "/timeline", element: <S><TimelinePage /></S> },
          { path: "/members", element: <S><MembersPage /></S> },
          { path: "/activity", element: <S><ActivityPage /></S> },
          { path: "/search", element: <S><SearchPage /></S> },
          { path: "/settings", element: <S><SettingsPage /></S> },
          // D8 FIX: catch-all 404
          { path: "*", element: <S><NotFoundPage /></S> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
