import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shapes, Sparkles, Sun } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { chunky } from "@/components/game/ui";
import { cn } from "@/lib/utils";
import type { TKey } from "@/i18n";

export const Route = createFileRoute("/modes")({
  head: () => ({
    meta: [
      { title: "Choose a game — Mirror Maze" },
      { name: "description", content: "Pick Sun & Planets, Mirror Maze or Symmetry Studio." },
      { property: "og:title", content: "Choose a game — Mirror Maze" },
      { property: "og:description", content: "Three light and reflection games for young learners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Modes,
});

const MODES = [
  { to: "/space", icon: Sun, name: "spaceMode", desc: "modeSpaceDesc", variant: "gold" },
  { to: "/levels", icon: Sparkles, name: "appName", desc: "modeMazeDesc", variant: "teal" },
  { to: "/symmetry", icon: Shapes, name: "symmetry", desc: "modeSymDesc", variant: "teal" },
] as const satisfies readonly { to: "/space" | "/levels" | "/symmetry"; icon: typeof Sun; name: TKey; desc: TKey; variant: "gold" | "teal" }[];

function Modes() {
  const { t } = useSettings();
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label={t("back")} className={chunky({ variant: "soft", size: "icon" })}><ArrowLeft /></Link>
        <h1 className="font-display text-4xl font-extrabold text-gold text-glow">{t("chooseMode")}</h1>
      </header>
      {MODES.map((m) => (
        <Link key={m.to} to={m.to} className={cn(chunky({ variant: m.variant, size: "lg" }), "h-auto justify-start gap-4 py-5 text-left")}>
          <m.icon className="h-12 w-12 shrink-0" />
          <span className="flex flex-col">
            <span>{t(m.name)}</span>
            <span className="font-sans text-lg font-semibold opacity-80">{t(m.desc)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
