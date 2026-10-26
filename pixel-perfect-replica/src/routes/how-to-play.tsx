import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Hand, MousePointerClick, Move, RotateCw, Target, Undo2, ZoomIn } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { chunky } from "@/components/game/ui";
import { CodexList } from "@/components/game/Codex";
import type { TKey } from "@/i18n";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play — touch controls and science codex" },
      { name: "description", content: "Learn the touch controls and what mirrors, prisms, lenses and black holes do to light." },
      { property: "og:title", content: "How to Play — Mirror Maze" },
      { property: "og:description", content: "Touch controls plus a kid-friendly guide to every light tool." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowTo,
});

const STEPS: { icon: typeof Hand; k: TKey }[] = [
  { icon: Target, k: "ctrlGoal" }, { icon: MousePointerClick, k: "ctrlPick" }, { icon: Hand, k: "ctrlPlace" },
  { icon: Move, k: "ctrlDrag" }, { icon: RotateCw, k: "ctrlRotate" }, { icon: ZoomIn, k: "ctrlFine" }, { icon: Undo2, k: "ctrlUndo" },
];

function HowTo() {
  const { t } = useSettings();
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label={t("back")} className={chunky({ variant: "soft", size: "icon" })}><ArrowLeft /></Link>
        <h1 className="font-display text-4xl font-extrabold text-gold text-glow">{t("howToPlay")}</h1>
      </header>
      <section className="rounded-3xl bg-card-grad p-5 shadow-chunky">
        <h2 className="mb-3 font-display text-2xl font-bold text-secondary">{t("controls")}</h2>
        <ol className="grid gap-3">
          {STEPS.map(({ icon: I, k }, i) => (
            <li key={k} className="flex items-center gap-3 text-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted font-bold"><I className="h-7 w-7 text-gold" /></span>
              <span><b>{i + 1}.</b> {t(k)}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-3 font-display text-2xl font-bold text-secondary">{t("codex")}</h2>
        <CodexList />
      </section>
      <Link to="/modes" className={chunky({ variant: "gold", size: "lg" })}>{t("play")}</Link>
    </div>
  );
}
