import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Play, Settings, Star } from "lucide-react";
import { Glim } from "@/components/game/Glim";
import { MuteButton, SpeakButton, chunky } from "@/components/game/ui";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mirror Maze — bounce light to the star" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "A friendly mirror and light puzzle game for children in Class 3 to 5. English, हिन्दी and मराठी." },
      { property: "og:title", content: "Mirror Maze — bounce light to the star" },
      { property: "og:description", content: "Place mirrors, guide the beam, light up the star. Made for young learners." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, progress, space } = useSettings();
  const total = [...Object.values(progress), ...Object.values(space)].reduce((a, b) => a + b, 0);
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center gap-6 p-4 sm:p-8">
      <header className="flex w-full items-center justify-between gap-2">
        <div className="flex h-14 items-center gap-2 rounded-2xl bg-muted px-4 text-2xl font-bold shadow-chunky" aria-label={t("stars")}>
          <Star className="h-7 w-7 fill-gold text-gold" /> {total}
        </div>
        <div className="flex gap-2">
          <MuteButton />
          <SpeakButton textKey="homeSay" />
        </div>
      </header>

      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <Glim mood="wave" size={150} />
        <h1 className="font-display text-6xl font-extrabold leading-none text-gold text-glow sm:text-7xl">Mirror Maze</h1>
      </div>

      <Link to="/modes" className={cn(chunky({ variant: "gold", size: "lg" }), "w-full max-w-sm")}>
        <Play className="h-10 w-10 fill-current" /> {t("play")}
      </Link>
      <Link to="/how-to-play" className={cn(chunky({ variant: "teal", size: "md" }), "w-full max-w-sm h-16 text-2xl")}>
        <BookOpen className="h-8 w-8" /> {t("howToPlay")}
      </Link>
      <Link to="/settings" className={cn(chunky({ variant: "teal", size: "md" }), "w-full max-w-sm h-16 text-2xl")}>
        <Settings className="h-8 w-8" /> {t("settings")}
      </Link>

    </div>
  );
}
