import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap, Trash2, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { ChunkyButton, LangToggle, chunky } from "@/components/game/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Mirror Maze" },
      { name: "description", content: "Sound, language, colour-blind beams and saved progress." },
      { property: "og:title", content: "Settings — Mirror Maze" },
      { property: "og:description", content: "Change sound, language and progress options." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { t, muted, toggleMute, patterns, togglePatterns, resetProgress } = useSettings();
  const row = "flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4 text-xl font-bold";
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col gap-4 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label={t("back")} className={chunky({ variant: "soft", size: "icon" })}><ArrowLeft /></Link>
        <h1 className="font-display text-4xl font-extrabold text-gold text-glow">{t("settings")}</h1>
      </header>
      <div className={row}>{t("sound")}
        <ChunkyButton variant={muted ? "soft" : "gold"} onClick={toggleMute} aria-pressed={!muted}>{muted ? <VolumeX /> : <Volume2 />}</ChunkyButton>
      </div>
      <div className={row}>{t("language")}<LangToggle /></div>
      <div className={row}>{t("colorblind")}
        <ChunkyButton variant={patterns ? "gold" : "soft"} onClick={togglePatterns} aria-pressed={patterns}>┅</ChunkyButton>
      </div>
      <div className={row}>{t("resetProgress")}
        <ChunkyButton variant="danger" aria-label={t("resetProgress")} onClick={() => { if (window.confirm(t("resetConfirm"))) resetProgress(); }}><Trash2 /></ChunkyButton>
      </div>
      <Link to="/teacher" className={cn(chunky({ variant: "ghost", size: "md" }), "text-muted-foreground")}><GraduationCap /> {t("teacher")}</Link>
    </div>
  );
}
