import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
