import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { LEVELS } from "@/game/levels";
import { useSettings } from "@/lib/settings";
import { MuteButton, SpeakButton } from "@/components/game/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Level map — Mirror Maze" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Forty mirror puzzles for Class 3, 4 and 5. Every level is open to play." },
      { property: "og:title", content: "Level map — Mirror Maze" },
      { property: "og:description", content: "Pick any of 40 light-and-mirror puzzles." },
    ],
  }),
  component: LevelMap,
});

const OFFSETS = ["translate-y-0", "translate-y-6", "translate-y-10", "translate-y-6", "translate-y-0"];

function LevelMap() {
  const { t, progress } = useSettings();
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-2">
        <Link to="/modes" aria-label={t("back")} className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted shadow-chunky">
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <div className="flex-1" />
        <MuteButton />
        <SpeakButton textKey="levelsSay" />
      </header>
      {([3, 4, 5] as const).map((cls) => {
        const ls = LEVELS.filter((l) => l.cls === cls);
        const rows: typeof ls[] = [];
        for (let i = 0; i < ls.length; i += 5) rows.push(ls.slice(i, i + 5));
        return (
          <section key={cls} className="rounded-3xl bg-card-grad p-5 pb-10 shadow-chunky">
            <h2 className="mb-4 font-display text-3xl font-extrabold text-gold">{t("className", { n: cls })}</h2>
            <div className="flex flex-col gap-10">
              {rows.map((row, ri) => (
                <div key={ri} className={cn("relative flex justify-between gap-2", ri % 2 === 1 && "flex-row-reverse")}>
                  <div className="absolute left-6 right-6 top-1/2 -z-0 border-t-4 border-dashed border-border" aria-hidden />
                  {row.map((l, i) => {
                    const s = progress[l.id] ?? 0;
                    return (
                      <Link
                        key={l.id}
                        to="/play/$levelId"
                        params={{ levelId: String(l.id) }}
                        className={cn(
                          "relative z-10 flex h-16 w-16 flex-col items-center justify-center rounded-full font-display text-2xl font-extrabold shadow-chunky transition-transform active:translate-y-1 sm:h-20 sm:w-20",
                          s > 0 ? "bg-gold-grad text-primary-foreground" : "bg-muted text-foreground",
                          OFFSETS[i],
                        )}
                        aria-label={`${t("level", { n: l.id })}${s ? `, ${s} ${t("stars")}` : ""}`}
                      >
                        {l.id}
                        {s > 0 && (
                          <span className="absolute -bottom-5 flex">
                            {[1, 2, 3].map((n) => (
                              <Star key={n} className={cn("h-4 w-4", n <= s ? "fill-gold text-gold" : "text-muted-foreground")} />
                            ))}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
