import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/layouts/app-layout";
import { HomePage } from "@/pages/home";
import { InboxPage } from "@/pages/inbox";
import { MyTasksPage } from "@/pages/my-tasks";
import { FavoritesPage } from "@/pages/favorites";
import { NotificationsPage } from "@/pages/notifications";
import { OverviewPage } from "@/pages/overview";
import { ProjectsPage } from "@/pages/projects";
import { TasksPage } from "@/pages/tasks";
import { CalendarPage } from "@/pages/calendar";
import { TimelinePage } from "@/pages/timeline";
import { MembersPage } from "@/pages/members";
import { ActivityPage } from "@/pages/activity";
import { SearchPage } from "@/pages/search";
import { SettingsPage } from "@/pages/settings";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/inbox", element: <InboxPage /> },
      { path: "/my-tasks", element: <MyTasksPage /> },
      { path: "/favorites", element: <FavoritesPage /> },
      { path: "/notifications", element: <NotificationsPage /> },
      { path: "/overview", element: <OverviewPage /> },
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/calendar", element: <CalendarPage /> },
      { path: "/timeline", element: <TimelinePage /> },
      { path: "/members", element: <MembersPage /> },
      { path: "/activity", element: <ActivityPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
