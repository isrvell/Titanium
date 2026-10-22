import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

/** Redirect authenticated users away from auth pages */
export function GuestRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
