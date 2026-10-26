import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { LEVELS } from "@/game/levels";
import { SYM_LEVELS } from "@/game/symmetry";
import { useSettings } from "@/lib/settings";
import { ChunkyButton, LangToggle, chunky } from "@/components/game/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher & parent corner — Mirror Maze" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "See levels completed per class and reset progress on this device." },
      { property: "og:title", content: "Teacher & parent corner — Mirror Maze" },
      { property: "og:description", content: "Track progress across Class 3, 4 and 5 puzzles." },
    ],
  }),
  component: Teacher,
});

function Teacher() {
  const { t, progress, sym, resetProgress, patterns, togglePatterns } = useSettings();
  const stars = Object.values(progress).reduce((a, b) => a + b, 0);
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-5 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label={t("back")} className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted shadow-chunky">
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <h1 className="font-display text-3xl font-extrabold">{t("teacherTitle")}</h1>
      </header>
      {([3, 4, 5] as const).map((cls) => {
        const ls = LEVELS.filter((l) => l.cls === cls);
        const done = ls.filter((l) => progress[l.id]).length;
        return (
          <div key={cls} className="rounded-3xl bg-card-grad p-5 shadow-chunky">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold text-gold">{t("className", { n: cls })}</h2>
              <span className="text-lg">{t("doneOf", { done, total: ls.length })}</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gold-grad" style={{ width: `${(done / ls.length) * 100}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 rounded-3xl bg-card-grad p-5 text-lg shadow-chunky">
        <span className="flex items-center gap-2"><Star className="h-6 w-6 fill-gold text-gold" /> {t("starsOf", { n: stars })}</span>
        <span>{t("symDone", { done: Object.keys(sym).length, total: SYM_LEVELS.length })}</span>
      </div>
      <LangToggle />
      <button onClick={togglePatterns} aria-pressed={patterns} className={cn(chunky({ variant: patterns ? "gold" : "soft", size: "md" }), "self-start text-lg")}>
        ┅ {t("colorblind")}
      </button>
      <ChunkyButton size="md" variant="danger" className="self-start" onClick={() => { if (window.confirm(t("resetConfirm"))) resetProgress(); }}>
        {t("resetProgress")}
      </ChunkyButton>
    </div>
  );
}
