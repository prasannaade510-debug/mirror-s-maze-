import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, RotateCcw, Pause, Play, Undo2, Trash2, Star as StarIcon } from "lucide-react";
import {
  canPlace, evaluate, applyMirrorAction, nextGameplayHint, key, starsFor,
  type BeamColor, type Level, type MirrorMap, type MirrorType, type MirrorAction, type Trace,
} from "@/game/engine";
import { LEVELS } from "@/game/levels";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { ChunkyButton, MuteButton, SpeakButton } from "./ui";
import { Glim, type GlimMood } from "./Glim";

const SEG_MS = 400;
const BEAM_VAR: Record<BeamColor, string> = {
  gold: "var(--color-beam-gold)",
  red: "var(--color-beam-red)",
  blue: "var(--color-beam-blue)",
};
const DASH: Record<BeamColor, string | undefined> = { gold: undefined, red: undefined, blue: "0.18 0.12" };

interface Drag {
  from: string | null;
  type: MirrorType;
  sx: number;
  sy: number;
  px: number;
  py: number;
  moved: boolean;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function MirrorGame({ level }: { level: Level }) {
  const { t, patterns, recordLevel } = useSettings();
  const navigate = useNavigate();
  const [mirrors, setMirrors] = useState<MirrorMap>({});
  const [hints, setHints] = useState<string[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<MirrorType | null>(null);
  const [history, setHistory] = useState<MirrorMap[]>([]);
  const [paused, setPaused] = useState(false);
  const [hintKind, setHintKind] = useState<"place" | "rotate" | "remove" | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [mood, setMood] = useState<GlimMood>("wave");
  const [wobble, setWobble] = useState(0);
  const [won, setWon] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset when level changes.
  useEffect(() => {
    setMirrors({}); setHints([]); setWon(null); setSelected(null); setMood("wave"); setChanges(0); setHistory([]); setPaused(false); setHintKind(null);
  }, [level.id]);

  const used = Object.keys(mirrors).length;
  const remaining = level.inventory - used;
  const result = useMemo(() => evaluate(level, mirrors), [level, mirrors]);
  const animKey = useMemo(() => JSON.stringify(result.traces.map((tr) => tr.points)), [result]);

  // React to every change: chimes, win or gentle miss.
  useEffect(() => {
    if (changes === 0 || paused || won !== null) return;
    let celebration: number | undefined;
    const rm = reducedMotion();
    const per = rm ? 0 : SEG_MS / 1000;
    result.traces.forEach((tr) => tr.bounces.slice(0, 8).forEach((_, i) => sfx.chime(per * (i + 1), i)));
    const longest = Math.max(...result.traces.map((tr) => tr.points.length - 1));
    const wait = rm ? 150 : longest * SEG_MS + 100;
    const id = window.setTimeout(() => {
      if (result.solved) {
        sfx.sparkle();
        setMood("happy");
        const s = starsFor(level, used);
        recordLevel(level.id, s);
        celebration = window.setTimeout(() => { setWon(s); sfx.cheer(); }, rm ? 0 : 700);
      } else if (remaining === 0) {
        sfx.boing();
        setMood("tilt");
        setWobble((w) => w + 1);
      } else setMood("idle");
    }, wait);
    return () => { window.clearTimeout(id); if (celebration !== undefined) window.clearTimeout(celebration); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, changes, paused, won]);

  const update = useCallback((action: MirrorAction) => {
    if (paused || won !== null) return false;
    const next = applyMirrorAction(level, mirrors, action);
    if (next === mirrors) return false;
    setHistory((h) => [...h, mirrors]);
    setMirrors(next);
    setHints([]); setHintKind(null);
    setChanges((c) => c + 1);
    sfx.pop();
    return true;
  }, [level, mirrors, paused, won]);

  const placeAt = (x: number, y: number, type: MirrorType = selected ?? "/") =>
    update({ kind: "place", x, y, type });

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setMirrors(previous); setHistory((h) => h.slice(0, -1));
    setHints([]); setHintKind(null); setWon(null); setMood("idle");
    setChanges((c) => c + 1); sfx.pop();
  };

  const cellFromClient = (cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor(((cx - r.left) / r.width) * level.width);
    const y = Math.floor(((cy - r.top) / r.height) * level.height);
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) return null;
    return { x, y };
  };

  // Global pointer tracking while dragging.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => d && { ...d, px: e.clientX, py: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10 });
    };
    const up = (e: PointerEvent) => {
      const d = drag;
      setDrag(null);
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
      if (!moved) {
        if (d.from) { const [x = 0, y = 0] = d.from.split(",").map(Number); setCursor({ x, y }); update({ kind: "rotate", from: d.from }); }
        return;
      }
      const c = cellFromClient(e.clientX, e.clientY);
      if (d.from) {
        const from = d.from;
        if (!c) { update({ kind: "remove", from }); return; }
        const k = key(c.x, c.y);
        if (k === from) return;
        update({ kind: "move", from, x: c.x, y: c.y });
      } else if (c) {
        if (placeAt(c.x, c.y, d.type)) setSelected(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    const cancel = () => setDrag(null);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.from, drag?.sx, drag?.sy, drag !== null, mirrors, remaining]);

  const startDrag = (e: RPE, from: string | null, type: MirrorType) => {
    if (paused || won !== null) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({ from, type, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, moved: false });
  };

  const onCellTap = (x: number, y: number) => {
    setCursor({ x, y });
    if (selected && placeAt(x, y)) setSelected(remaining - 1 > 0 ? selected : null);
  };

  const hint = () => {
    const next = nextGameplayHint(level, mirrors);
    if (next) { setHints([key(next.x, next.y)]); setHintKind(next.kind); }
    sfx.chime();
  };

  const resetBoard = () => {
    setMirrors({}); setHints([]); setHintKind(null); setChanges(0);
    setHistory([]); setSelected(null); setDrag(null); setMood("idle"); setWon(null); setPaused(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (paused || won !== null) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
    const c = cursor ?? { x: 0, y: 0 };
    const mv: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const step = mv[e.key];
    if (step) {
      e.preventDefault();
      setCursor({ x: Math.min(level.width - 1, Math.max(0, c.x + step[0])), y: Math.min(level.height - 1, Math.max(0, c.y + step[1])) });
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setCursor(c);
      const k = key(c.x, c.y);
      if (mirrors[k]) update({ kind: "rotate", from: k });
      else placeAt(c.x, c.y);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const k = key(c.x, c.y);
      e.preventDefault();
      if (mirrors[k]) update({ kind: "remove", from: k });
    }
  };

  const ghosts = [
    ...(level.tutorial && used === 0 && level.solution[0] ? [key(level.solution[0].x, level.solution[0].y)] : []),
    ...hints,
  ];
  const nextLevel = LEVELS.find((l) => l.id === level.id + 1);
  const rm = reducedMotion();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-center gap-2 p-3 sm:p-4">
        <Link to="/levels" aria-label={t("back")} className={cn("inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted shadow-chunky active:translate-y-1")}>
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <div className="flex-1 text-center font-display text-2xl font-bold">
          {t("level", { n: level.id })}
        </div>
        <ChunkyButton title={t("undo")} aria-label={t("undo")} disabled={history.length === 0} onClick={undo}><Undo2 className="h-7 w-7" /></ChunkyButton>
        <ChunkyButton title={t("pause")} aria-label={t("pause")} onClick={() => { setPaused(true); setDrag(null); }}><Pause className="h-7 w-7" /></ChunkyButton>
        <ChunkyButton title={t("hint")} aria-label={t("hint")} onClick={hint}><Lightbulb className="h-7 w-7 text-gold" /></ChunkyButton>
        <ChunkyButton aria-label={t("reset")} onClick={resetBoard}><RotateCcw className="h-7 w-7" /></ChunkyButton>
        <MuteButton />
        <SpeakButton textKey={level.tutorial ? "tutorialSay" : "gameSay"} />
      </header>

      <div className="flex justify-center gap-6 pb-3 text-lg font-bold text-muted-foreground"><span>{t("moves", { n: history.length })}</span><span>{t("mirrorsLeft", { n: remaining })}</span></div>
      <main className="flex flex-1 flex-col items-center gap-4 px-3 pb-4 landscape:md:flex-row landscape:md:items-start landscape:md:justify-center">
        <div className="relative w-full max-w-[min(92vw,78dvh)]">
          <div
            tabIndex={0}
            onKeyDown={onKey}
            onFocus={() => !cursor && setCursor({ x: 0, y: 0 })}
            className="rounded-3xl bg-card-grad p-2 shadow-chunky outline-none focus-visible:ring-4 focus-visible:ring-ring sm:p-3"
            style={{ touchAction: "none" }}
            aria-label={t("gameSay")}
          >
            <Board
              svgRef={svgRef}
              level={level}
              mirrors={mirrors}
              traces={result.traces}
              animKey={animKey}
              ghosts={ghosts}
              cursor={cursor}
              patterns={patterns}
              wobble={wobble}
              solved={result.solved && mood === "happy"}
              selected={selected !== null || Boolean(drag?.moved)}
              reduced={rm}
              dragFrom={drag?.moved ? drag.from : null}
              onCell={onCellTap}
              onMirrorDown={(e, k) => startDrag(e, k, mirrors[k] ?? "/")}
            />
          </div>
          {level.angleHint && result.traces.some((tr) => tr.bounces.length > 0) && !result.solved && (
            <p className="mt-2 text-center text-lg text-muted-foreground">↳ {t("angleHint")}</p>
          )}
        </div>

        {/* Tray + Glim */}
        <aside className="flex w-full max-w-xl items-center gap-3 rounded-3xl bg-card/70 p-3 shadow-chunky landscape:md:w-56 landscape:md:flex-col">
          <Glim mood={mood} size={84} />
          <div className="flex flex-1 flex-wrap items-center justify-center gap-3" style={{ touchAction: "none" }} aria-label={t("tray")}>
            {(["/", "\\"] as MirrorType[]).map((type) => (
              <ChunkyButton
                key={type}
                aria-label={t(type === "/" ? "mirrorSlash" : "mirrorBackslash")}
                aria-pressed={selected === type}
                disabled={remaining <= 0}
                onPointerDown={(e) => { setSelected((s) => s === type ? null : type); startDrag(e, null, type); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected((s) => s === type ? null : type); } }}
                className={cn("h-16 w-16 sm:h-20 sm:w-20", selected === type && "ring-4 ring-ring")}
              >
                <MirrorGlyph type={type} />
              </ChunkyButton>
            ))}
            <ChunkyButton title={t("removeMirror")} aria-label={t("removeMirror")} disabled={!cursor || !mirrors[key(cursor.x, cursor.y)]} onClick={() => { if (cursor) update({ kind: "remove", from: key(cursor.x, cursor.y) }); }}><Trash2 className="h-6 w-6" /></ChunkyButton>
            {remaining <= 0 && <span className="text-3xl opacity-50" aria-hidden>✦</span>}
          </div>
          {hintKind && <p role="status" className="text-center text-lg text-gold">{t(hintKind === "place" ? "hintPlace" : hintKind === "rotate" ? "hintRotate" : "hintRemove")}</p>}
        </aside>
      </main>

      {drag?.moved && (
        <div className="pointer-events-none fixed z-50 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-muted/80 shadow-glow" style={{ left: drag.px, top: drag.py }}>
          <MirrorGlyph type={drag.type} />
        </div>
      )}

      {paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("paused")}>
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-card-grad p-6 shadow-chunky">
            <h2 className="text-center text-3xl font-bold">{t("paused")}</h2>
            <ChunkyButton size="md" variant="gold" onClick={() => setPaused(false)} autoFocus><Play className="h-6 w-6" />{t("resume")}</ChunkyButton>
            <ChunkyButton size="md" onClick={resetBoard}><RotateCcw className="h-6 w-6" />{t("reset")}</ChunkyButton>
            <ChunkyButton size="md" onClick={() => navigate({ to: "/levels" })}><ArrowLeft className="h-6 w-6" />{t("levels")}</ChunkyButton>
          </div>
        </div>
      )}
      {won !== null && (
        <WinOverlay
          stars={won}
          onReplay={resetBoard}
          onNext={() => (nextLevel ? navigate({ to: "/play/$levelId", params: { levelId: String(nextLevel.id) } }) : navigate({ to: "/levels" }))}
        />
      )}
    </div>
  );
}

function MirrorGlyph({ type = "/" }: { type?: MirrorType }) {
  return (
    <svg viewBox="0 0 10 10" className="h-full w-full p-2" aria-hidden>
      <line x1={type === "/" ? 2 : 2} y1={type === "/" ? 8 : 2} x2={8} y2={type === "/" ? 2 : 8} stroke="var(--color-mirror)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1={type === "/" ? 2.6 : 2.6} y1={type === "/" ? 8.6 : 1.4} x2={8.6} y2={type === "/" ? 2.6 : 7.4} stroke="var(--color-secondary)" strokeWidth="0.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function StarShape({ x, y, color, glow }: { x: number; y: number; color: BeamColor; glow: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 0.4 : 0.17;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${x + 0.5 + r * Math.cos(a)},${y + 0.5 + r * Math.sin(a)}`;
  }).join(" ");
  const fill = color === "gold" ? "var(--color-gold)" : BEAM_VAR[color];
  return (
    <g className={glow ? "anim-shimmer" : undefined}>
      <circle cx={x + 0.5} cy={y + 0.5} r={0.45} fill={fill} opacity={0.2} className="anim-pulse" />
      <polygon points={pts} fill={fill} stroke="var(--color-primary-foreground)" strokeWidth={0.03} />
    </g>
  );
}

interface BoardProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  level: Level;
  mirrors: MirrorMap;
  traces: Trace[];
  animKey: string;
  ghosts: string[];
  cursor: { x: number; y: number } | null;
  patterns: boolean;
  wobble: number;
  solved: boolean;
  selected: boolean;
  reduced: boolean;
  dragFrom: string | null;
  onCell: (x: number, y: number) => void;
  onMirrorDown: (e: RPE, k: string) => void;
}

function Board(p: BoardProps) {
  const { t } = useSettings();
  const { level } = p;
  const walls = new Set(level.walls.map(([x, y]) => key(x, y)));
  const cells = [];
  for (let y = 0; y < level.height; y++)
    for (let x = 0; x < level.width; x++) {
      const placeable = canPlace(level, x, y) && !p.mirrors[key(x, y)];
      cells.push(
        <rect
          key={key(x, y)}
          data-cell={key(x, y)}
          x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.14}
          fill={walls.has(key(x, y)) ? "var(--color-wall)" : "var(--color-cell)"}
          stroke={p.selected && placeable ? "var(--color-primary)" : "var(--color-cell-edge)"}
          strokeWidth={p.selected && placeable ? 0.04 : 0.02}
          onClick={() => p.onCell(x, y)}
          style={{ cursor: placeable ? "pointer" : "default" }}
        />,
      );
    }
  const delay = (i: number) => (p.reduced ? 0 : i * 400);

  return (
    <svg ref={p.svgRef} viewBox={`0 0 ${level.width} ${level.height}`} className="block h-auto w-full select-none" role="img" aria-label={t("grid", { w: level.width, h: level.height })}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.08" />
        </filter>
      </defs>
      {cells}
      {/* walls: crystals */}
      {level.walls.map(([x, y]) => (
        <polygon key={`w${x},${y}`} points={`${x + 0.5},${y + 0.15} ${x + 0.8},${y + 0.5} ${x + 0.5},${y + 0.85} ${x + 0.2},${y + 0.5}`} fill="var(--color-accent)" opacity={0.55} pointerEvents="none" />
      ))}
      {/* ghosts (hints / tutorial) */}
      {p.ghosts.map((g) => {
        const [x = 0, y = 0] = g.split(",").map(Number);
        const sol = level.solution.find((s) => s.x === x && s.y === y);
        return (
          <g key={`g${g}`} pointerEvents="none" className="anim-pulse">
            <rect x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.14} fill="none" stroke="var(--color-primary)" strokeWidth={0.05} strokeDasharray="0.12 0.08" />
            <line x1={x + 0.22} y1={sol?.type === "\\" ? y + 0.22 : y + 0.78} x2={x + 0.78} y2={sol?.type === "\\" ? y + 0.78 : y + 0.22} stroke="var(--color-mirror)" strokeWidth={0.07} strokeLinecap="round" opacity={0.5} />
            {level.tutorial && <text x={x + 0.5} y={y - 0.05} textAnchor="middle" fontSize={0.45} className="anim-float">👇</text>}
          </g>
        );
      })}
      {/* sources */}
      {level.sources.map((s) => {
        const ang = { right: 0, down: 90, left: 180, up: 270 }[s.dir];
        return (
          <g key={`s${s.x},${s.y}`} pointerEvents="none">
            <circle cx={s.x + 0.5} cy={s.y + 0.5} r={0.36} fill={BEAM_VAR[s.color]} opacity={0.35} />
            <circle cx={s.x + 0.5} cy={s.y + 0.5} r={0.24} fill={BEAM_VAR[s.color]} />
            <path d="M0.08 -0.14 L0.3 0 L0.08 0.14 Z" fill="var(--color-primary-foreground)" transform={`translate(${s.x + 0.5} ${s.y + 0.5}) rotate(${ang})`} />
          </g>
        );
      })}
      {level.stars.map((s) => (
        <StarShape key={`t${s.x},${s.y}`} x={s.x} y={s.y} color={s.color} glow={p.solved} />
      ))}
      {/* beams */}
      <g key={p.animKey} pointerEvents="none">
        {p.traces.map((tr, ti) => {
          const col = BEAM_VAR[tr.source.color];
          const dash = p.patterns ? DASH[tr.source.color] : undefined;
          return (
            <g key={ti}>
              {tr.points.slice(1).map((pt, i) => {
                const a = tr.points[i] ?? pt;
                const style = { animationDelay: `${delay(i)}ms` };
                return (
                  <g key={i}>
                    <line x1={a.x} y1={a.y} x2={pt.x} y2={pt.y} stroke={col} strokeWidth={0.28} opacity={0.45} filter="url(#glow)" pathLength={1} className="beam-seg" style={style} />
                    <g className="fade-in" style={{ animationDelay: `${delay(i)}ms` }}>
                      <line x1={a.x} y1={a.y} x2={pt.x} y2={pt.y} stroke="var(--color-foreground)" strokeWidth={0.07} strokeLinecap="round" strokeDasharray={dash} />
                      <line x1={a.x} y1={a.y} x2={pt.x} y2={pt.y} stroke={col} strokeWidth={0.12} strokeLinecap="round" strokeDasharray={dash} opacity={0.85} />
                    </g>
                  </g>
                );
              })}
              {tr.bounces.map((b, i) => {
                const cx = b.x + 0.5, cy = b.y + 0.5, r = 0.2;
                const p1: [number, number] = [cx - b.inDir.dx * r, cy - b.inDir.dy * r];
                const p3 = [cx + b.outDir.dx * r, cy + b.outDir.dy * r];
                const p2 = [p1[0] + b.outDir.dx * r, p1[1] + b.outDir.dy * r];
                return (
                  <path key={`b${i}`} d={`M${p1} L${p2} L${p3}`} fill="none" stroke="var(--color-primary)" strokeWidth={0.035} className="fade-in" style={{ animationDelay: `${delay(i + 1)}ms` }} />
                );
              })}
              {tr.end === "star" && !p.reduced && (
                <g className="fade-in" style={{ animationDelay: `${delay(tr.points.length - 1)}ms` }}>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const end = tr.points[tr.points.length - 1] ?? { x: 0, y: 0 };
                    const a = (Math.PI / 4) * i;
                    return <circle key={i} cx={end.x} cy={end.y} r={0.05} fill="var(--color-gold)" className="burst-dot" style={{ ["--bx" as string]: `${Math.cos(a) * 0.6}px`, ["--by" as string]: `${Math.sin(a) * 0.6}px`, animationDelay: `${delay(tr.points.length - 1)}ms` }} />;
                  })}
                </g>
              )}
            </g>
          );
        })}
      </g>
      {/* mirrors */}
      {Object.entries(p.mirrors).map(([k, type]) => {
        const [x = 0, y = 0] = k.split(",").map(Number);
        if (k === p.dragFrom) return null;
        return (
          <g data-mirror={k} key={`m${k}-${p.wobble}`} onPointerDown={(e) => p.onMirrorDown(e, k)} style={{ cursor: "grab" }} className={p.wobble ? "anim-wobble" : undefined}>
            <rect x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.14} fill="var(--color-muted)" opacity={0.6} />
            <line x1={x + 0.2} y1={type === "/" ? y + 0.8 : y + 0.2} x2={x + 0.8} y2={type === "/" ? y + 0.2 : y + 0.8} stroke="var(--color-mirror)" strokeWidth={0.12} strokeLinecap="round" />
            <line x1={x + 0.27} y1={type === "/" ? y + 0.87 : y + 0.13} x2={x + 0.87} y2={type === "/" ? y + 0.27 : y + 0.73} stroke="var(--color-secondary)" strokeWidth={0.04} strokeLinecap="round" />
          </g>
        );
      })}
      {p.cursor && (
        <rect x={p.cursor.x + 0.02} y={p.cursor.y + 0.02} width={0.96} height={0.96} rx={0.16} fill="none" stroke="var(--color-ring)" strokeWidth={0.05} pointerEvents="none" />
      )}
    </svg>
  );
}

function WinOverlay({ stars, onNext, onReplay }: { stars: number; onNext: () => void; onReplay: () => void }) {
  const { t } = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("winSay")}>
      <div className="fade-in relative flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-card-grad p-8 shadow-chunky">
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (Math.PI * 2 * i) / 14;
            return <span key={i} className="burst-dot absolute left-1/2 top-1/3 text-2xl text-gold" style={{ ["--bx" as string]: `${Math.cos(a) * 160}px`, ["--by" as string]: `${Math.sin(a) * 160}px` }}>✦</span>;
          })}
        </div>
        <Glim mood="happy" size={120} />
        <div className="flex gap-2" aria-label={`${stars} / 3`}>
          {[1, 2, 3].map((n) => (
            <StarIcon key={n} className={cn("h-14 w-14 fade-in", n <= stars ? "fill-gold text-gold" : "text-muted")} style={{ animationDelay: `${n * 200}ms` }} />
          ))}
        </div>
        <SpeakButton textKey="winSay" />
        <div className="flex w-full gap-3">
          <ChunkyButton size="md" className="flex-1" onClick={onReplay} aria-label={t("replay")}>
            <RotateCcw className="h-6 w-6" /> {t("replay")}
          </ChunkyButton>
          <ChunkyButton size="md" variant="gold" className="flex-[2]" onClick={onNext} autoFocus>
            {t("next")} →
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
