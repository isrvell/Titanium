import { Star } from "lucide-react";

export function FavoritesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Favorites</h2>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <Star className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Your starred items will appear here.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Coming soon</p>
      </div>
    </div>
  );
}
