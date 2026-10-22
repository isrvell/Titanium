import { ChartGantt } from "lucide-react";

export function TimelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <ChartGantt className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Visualize project timelines.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Coming soon</p>
      </div>
    </div>
  );
}
