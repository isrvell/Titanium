import { useThemeStore } from "@/stores/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import type { Theme } from "@/types";

const THEME_ICONS: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

export function Topbar({ title }: { title: string }) {
  const { theme, setTheme } = useThemeStore();
  const Icon = THEME_ICONS[theme];

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!;
    setTheme(next);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={`Theme: ${theme}`}
        >
          <Icon className="size-4" />
        </button>
      </div>
    </header>
  );
}
