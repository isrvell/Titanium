import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <FileQuestion className="size-12 text-muted-foreground/50" />
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="outline">
          <ArrowLeft data-icon="inline-start" />
          Back to home
        </Button>
      </Link>
    </div>
  );
}
