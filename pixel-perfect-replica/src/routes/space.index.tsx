import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { SPACE_LEVELS } from "@/game/spaceLevels";
import { useSettings } from "@/lib/settings";
import { SpeakButton, chunky } from "@/components/game/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/space/")({
  head: () => ({
    meta: [
      { title: "Sun & Planets — light puzzle worlds" },
      { name: "description", content: "Bend sunlight with mirrors, prisms, lenses and black holes to wake up sleeping planets." },
      { property: "og:title", content: "Sun & Planets — light puzzle worlds" },
      { property: "og:description", content: "A science light puzzle: guide sunlight to every planet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpaceLevels,
});

function SpaceLevels() {
  const { t, space } = useSettings();
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <Link to="/modes" aria-label={t("back")} className={chunky({ variant: "soft", size: "icon" })}><ArrowLeft /></Link>
        <h1 className="font-display text-4xl font-extrabold text-gold text-glow">{t("spaceMode")}</h1>
        <SpeakButton textKey="spaceSay" />
      </header>
      <p className="text-center text-xl text-muted-foreground">{t("spaceSay")}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {SPACE_LEVELS.map((l) => {
          const s = space[l.id] ?? 0;
          return (
            <Link key={l.id} to="/space/$levelId" params={{ levelId: String(l.id) }}
              className={cn("flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl bg-card-grad shadow-chunky transition-transform hover:scale-105", s > 0 && "ring-4 ring-gold/60")}>
              <span className="font-display text-4xl font-extrabold">{l.id}</span>
              <span className="flex">{[1, 2, 3].map((n) => <Star key={n} className={cn("h-5 w-5", n <= s ? "fill-gold text-gold" : "text-muted-foreground")} />)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
