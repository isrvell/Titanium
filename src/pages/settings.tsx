import { useEffect, useState } from "react";
import { signOut, authClient, useSession } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun, LogOut, Check } from "lucide-react";

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const THEME_OPTIONS = [
  { key: "system", label: "System", icon: Monitor },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
] as const;

export function SettingsPage() {
  const { data: session } = useSession();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
    }
  }, [session]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await authClient.updateUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={session.user?.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials(session.user?.name ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{session.user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{session.user?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-name">Full name</Label>
              <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-title">Job title</Label>
              <Input id="settings-title" disabled placeholder="Coming soon" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Spinner data-icon="inline-start" />}
              {saved ? <Check data-icon="inline-start" /> : null}
              {saved ? "Saved" : "Save changes"}
            </Button>
            <span className="text-sm text-muted-foreground">{session.user?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  theme === key
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Signed in as{" "}
            <Badge variant="secondary">{session.user?.email}</Badge>
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => signOut()}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
