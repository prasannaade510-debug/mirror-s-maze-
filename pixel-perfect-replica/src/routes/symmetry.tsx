import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, RotateCcw } from "lucide-react";
import { SYM_LEVELS, checkSymmetry, dims, givenCells, sideOf, targetCells } from "@/game/symmetry";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/audio";
import { ChunkyButton, MuteButton, SpeakButton } from "@/components/game/ui";
import { Glim } from "@/components/game/Glim";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/symmetry")({
  head: () => ({
    meta: [
      { title: "Symmetry mode — Mirror Maze" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Finish the mirror picture: hearts, butterflies, houses and more." },
      { property: "og:title", content: "Symmetry mode — Mirror Maze" },
      { property: "og:description", content: "Tap squares to complete the reflection across the mirror line." },
    ],
  }),
  component: Symmetry,
});

function Symmetry() {
  const { t, sym, recordSym } = useSettings();
  const [idx, setIdx] = useState(0);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [peek, setPeek] = useState(false);
  const level = SYM_LEVELS[idx] ?? SYM_LEVELS[0]!;
  const { w, h } = dims(level);
  const given = useMemo(() => givenCells(level), [level]);
  const target = useMemo(() => targetCells(level), [level]);
  const { correct, done } = checkSymmetry(level, filled);

  useEffect(() => { setFilled(new Set()); }, [idx]);
  useEffect(() => {
    if (done) { sfx.sparkle(); recordSym(level.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const toggle = (x: number, y: number) => {
    if (sideOf(level, x, y) !== "target" || done) return;
    const k = `${x},${y}`;
    setFilled((f) => {
      const n = new Set(f);
      if (n.has(k)) n.delete(k); else { n.add(k); target.has(k) ? sfx.chime(0, n.size % 6) : sfx.pop(); }
      return n;
    });
  };
  const doPeek = () => { setPeek(true); window.setTimeout(() => setPeek(false), 1500); };

  const line =
    level.axis === "v" ? <line x1={w / 2} y1={-0.2} x2={w / 2} y2={h + 0.2} />
    : level.axis === "h" ? <line x1={-0.2} y1={h / 2} x2={w + 0.2} y2={h / 2} />
    : <line x1={0} y1={0} x2={w} y2={h} />;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex items-center gap-2">
        <Link to="/modes" aria-label={t("back")} className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted shadow-chunky">
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <div className="flex-1 text-center font-display text-2xl font-bold">{t(level.shape)}</div>
        <ChunkyButton aria-label={t("peek")} aria-pressed={peek} onClick={doPeek}><Eye className="h-7 w-7" /></ChunkyButton>
        <ChunkyButton aria-label={t("reset")} onClick={() => setFilled(new Set())}><RotateCcw className="h-7 w-7" /></ChunkyButton>
        <MuteButton />
        <SpeakButton textKey={done ? "symWinSay" : "symSay"} />
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {SYM_LEVELS.map((l, i) => (
          <button key={l.id} role="tab" aria-selected={i === idx} onClick={() => setIdx(i)}
            className={cn("flex min-h-14 shrink-0 items-center gap-1 rounded-2xl px-4 text-lg font-bold shadow-chunky", i === idx ? "bg-teal-grad text-secondary-foreground" : "bg-muted")}>
            {sym[l.id] && <Check className="h-5 w-5 text-success" />} {t(l.shape)}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[min(94vw,70dvh)] rounded-3xl bg-card-grad p-3 shadow-chunky" style={{ touchAction: "none" }}>
        <svg viewBox={`-0.2 -0.2 ${w + 0.4} ${h + 0.4}`} className={cn("block w-full select-none", done && "anim-shimmer")}>
          {Array.from({ length: h }).flatMap((_, y) =>
            Array.from({ length: w }).map((_, x) => {
              const k = `${x},${y}`;
              const side = sideOf(level, x, y);
              const isGiven = given.has(k);
              const isFilled = filled.has(k);
              const isRight = correct.has(k);
              const ghost = peek && target.has(k) && !isFilled;
              const fill = isGiven ? "var(--color-gold)"
                : isFilled ? (isRight ? "var(--color-secondary)" : "var(--color-accent)")
                : ghost ? "var(--color-secondary)" : "var(--color-cell)";
              return (
                <rect key={k} x={x + 0.05} y={y + 0.05} width={0.9} height={0.9} rx={0.15}
                  fill={fill} opacity={ghost ? 0.4 : side === "given" && !isGiven ? 0.55 : 1}
                  stroke={isRight ? "var(--color-foreground)" : "var(--color-cell-edge)"} strokeWidth={isRight ? 0.05 : 0.02}
                  onClick={() => toggle(x, y)} style={{ cursor: side === "target" ? "pointer" : "default" }} />
              );
            }),
          )}
          <g stroke="var(--color-mirror)" strokeWidth={0.08} strokeDasharray="0.25 0.15" strokeLinecap="round" pointerEvents="none">{line}</g>
        </svg>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Glim mood={done ? "happy" : "idle"} size={90} />
        {done && idx < SYM_LEVELS.length - 1 && (
          <ChunkyButton variant="gold" size="lg" onClick={() => setIdx(idx + 1)}>{t("next")} →</ChunkyButton>
        )}
      </div>
    </div>
  );
}
