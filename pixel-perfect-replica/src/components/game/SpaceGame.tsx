import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, RotateCcw, RotateCw, Star, Trash2, Undo2 } from "lucide-react";
import { H, PRISM_R, TOOL_LEN, W, canPlaceAt, starsFor, toolSegment, trace, type Color, type Level, type Planet, type Tool, type ToolKind } from "@/game/optics";
import { SPACE_LEVELS, parOf } from "@/game/spaceLevels";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/audio";
import type { TKey } from "@/i18n";
import { ChunkyButton, SpeakButton, chunky } from "./ui";
import { CodexPanel, HoleArt, SunArt, type CodexId } from "./Codex";
import { cn } from "@/lib/utils";

const TOOL_KEY: Record<ToolKind, TKey> = {
  mirror: "toolMirror", prism: "toolPrism", lens: "toolLens", splitter: "toolSplitter",
  filterRed: "toolFilterRed", filterGreen: "toolFilterGreen", filterBlue: "toolFilterBlue",
};
const BEAM: Record<Color, string> = { white: "var(--beam-white)", red: "var(--beam-red)", green: "var(--beam-green)", blue: "var(--beam-blue)" };
const FILTER_COLOR: Partial<Record<ToolKind, Color>> = { filterRed: "red", filterGreen: "green", filterBlue: "blue" };
const FACT_KEY: Record<Level["fact"], TKey> = {
  reflect: "factReflect", lens: "factLens", prism: "factPrism", gravity: "factGravity", split: "factSplit",
  filter: "factFilter", wind: "factWind", whitehole: "factWhitehole", grand: "factGrand",
};
const COL_KEY = { red: "colRed", green: "colGreen", blue: "colBlue" } as const;

type Drag = { id: string; mode: "move" | "rotate"; dx: number; dy: number; before: Tool[] } | null;

export function SpaceGame({ level }: { level: Level }) {
  const { t, recordSpace } = useSettings();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [history, setHistory] = useState<Tool[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState<ToolKind | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [won, setWon] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [codex, setCodex] = useState(false);
  const counter = useRef(0);

  useEffect(() => { setTools([]); setHistory([]); setSelected(null); setWon(false); setShowCard(false); setArmed(null); }, [level.id]);
  useEffect(() => { if (!won) { setShowCard(false); return; } const id = setTimeout(() => setShowCard(true), 2800); return () => clearTimeout(id); }, [won]);

  const all = useMemo(() => [...level.fixed, ...tools], [level.fixed, tools]);
  const result = useMemo(() => trace(level, all), [level, all]);
  const left = (k: ToolKind) => (level.tray[k] ?? 0) - tools.filter((x) => x.kind === k).length;
  const stars = starsFor(tools.length, parOf(level));

  useEffect(() => {
    if (result.won && !won && !drag) {
      setWon(true); recordSpace(level.id, stars); sfx.sparkle(); sfx.cheer(0.4);
    }
  }, [result.won, won, drag, level.id, stars, recordSpace]);

  const commit = (next: Tool[], before = tools) => { setHistory((h) => [...h, before]); setTools(next); };
  const undo = () => { const prev = history.at(-1); if (!prev) return; setHistory((h) => h.slice(0, -1)); setTools(prev); setWon(false); };
  const reset = () => { if (tools.length) commit([]); setSelected(null); setWon(false); };
  const sel = tools.find((x) => x.id === selected) ?? null;
  const turn = (deg: number) => { if (!sel) return; commit(tools.map((x) => x.id === sel.id ? { ...x, angle: (x.angle + deg + 360) % 360 } : x)); sfx.pop(); };
  const remove = () => { if (!sel) return; commit(tools.filter((x) => x.id !== sel.id)); setSelected(null); };

  const toBoard = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const onBoardDown = (e: RPE<SVGSVGElement>) => {
    if (e.target !== e.currentTarget && !(e.target as Element).hasAttribute("data-bg")) return;
    const p = toBoard(e);
    if (armed && left(armed) > 0 && canPlaceAt(level, p.x, p.y)) {
      const id = `t${++counter.current}`;
      commit([...tools, { id, kind: armed, x: Math.round(p.x), y: Math.round(p.y), angle: armed === "prism" ? 270 : 45 }]);
      setSelected(id); sfx.pop();
      if (left(armed) - 1 <= 0) setArmed(null);
    } else setSelected(null);
  };
  const startDrag = (e: RPE, tool: Tool, mode: "move" | "rotate") => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = toBoard(e);
    setSelected(tool.id); setArmed(null);
    setDrag({ id: tool.id, mode, dx: tool.x - p.x, dy: tool.y - p.y, before: tools });
  };
  const onMove = (e: RPE<SVGSVGElement>) => {
    if (!drag) return;
    const p = toBoard(e);
    setTools((ts) => ts.map((x) => {
      if (x.id !== drag.id) return x;
      if (drag.mode === "rotate") return { ...x, angle: Math.round(((Math.atan2(p.y - x.y, p.x - x.x) * 180) / Math.PI + 360) % 360) };
      const nx = Math.round(p.x + drag.dx), ny = Math.round(p.y + drag.dy);
      return canPlaceAt(level, nx, ny) ? { ...x, x: nx, y: ny } : x;
    }));
  };
  const endDrag = () => {
    if (!drag) return;
    if (JSON.stringify(drag.before) !== JSON.stringify(tools)) setHistory((h) => [...h, drag.before]);
    setDrag(null);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if (!sel) return;
      if (e.key === "ArrowLeft" || e.key === "q") turn(-5);
      if (e.key === "ArrowRight" || e.key === "e") turn(5);
      if (e.key === "Delete" || e.key === "Backspace") remove();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const litCount = result.lit.filter(Boolean).length;
  const kinds = Object.keys(level.tray) as ToolKind[];
  const nextId = SPACE_LEVELS.find((l) => l.id === level.id + 1)?.id;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-3 p-3 sm:p-5">
      <header className="flex items-center justify-between gap-2">
        <Link to="/space" aria-label={t("back")} className={chunky({ variant: "soft", size: "icon" })}><ArrowLeft /></Link>
        <h1 className="font-display text-2xl font-extrabold text-gold sm:text-3xl">{t("world", { n: level.id })}</h1>
        <div className="flex gap-2">
          <ChunkyButton onClick={() => setCodex(true)} aria-label={t("codex")}><BookOpen /></ChunkyButton>
          <SpeakButton textKey="spaceGameSay" />
        </div>
      </header>
      {codex && <CodexPanel only={codexFor(level)} onClose={() => setCodex(false)} />}

      <div className="flex flex-wrap items-center justify-center gap-2 text-lg font-bold">
        <span className="rounded-xl bg-muted px-3 py-1">{t("planetsLit", { done: litCount, total: level.planets.length })}</span>
        <span className="rounded-xl bg-muted px-3 py-1">{t("moves", { n: history.length })}</span>
        <ChunkyButton onClick={undo} disabled={!history.length} aria-label={t("undo")}><Undo2 /></ChunkyButton>
        <ChunkyButton onClick={reset} aria-label={t("reset")}><RotateCcw /></ChunkyButton>
      </div>

      <div className="relative mx-auto w-full" style={{ maxWidth: "min(100%, 72dvh)" }}>
        <svg
          ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("board")}
          className={cn("block w-full touch-none rounded-3xl shadow-chunky", armed && "cursor-crosshair")}
          onPointerDown={onBoardDown} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        >
          <Defs level={level} />
          <rect data-bg width={W} height={H} fill="url(#space-bg)" />
          <rect data-bg width={W} height={H} fill="url(#stars)" opacity="0.8" />
          <rect x="6" y="6" width={W - 12} height={H - 12} fill="none" stroke="var(--space-brick)" strokeWidth="12" strokeDasharray="34 6" rx="8" />
          {level.walls.map((w, i) => (
            <line key={i} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke="var(--space-brick)" strokeWidth="22" strokeDasharray="30 5" />
          ))}
          {level.fields.map((f, i) => <FieldView key={i} f={f} t={t} />)}

          {result.rays.map((r, i) => {
            const pts = r.points.map((p) => `${p.x},${p.y}`).join(" ");
            return (
              <g key={i} pointerEvents="none">
                <polyline points={pts} fill="none" stroke={BEAM[r.color]} strokeWidth="22" opacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={pts} fill="none" stroke={BEAM[r.color]} strokeWidth="9" opacity="0.55" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                <polyline points={pts} fill="none" stroke="var(--beam-white)" strokeWidth="2.5" opacity={r.color === "white" ? 1 : 0.5} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}

          <g aria-label={t("sun")} pointerEvents="none">
            <SunArt x={level.sun.x} y={level.sun.y} r={36} spin />
          </g>

          {level.planets.map((p, i) => <PlanetView key={i} p={p} lit={!!result.lit[i]} idx={i} t={t} />)}

          {all.map((tool) => (
            <ToolView key={tool.id} tool={tool} selected={tool.id === selected} locked={!!tool.fixed}
              onBody={(e) => !tool.fixed && startDrag(e, tool, "move")}
              onHandle={(e) => startDrag(e, tool, "rotate")} label={t(TOOL_KEY[tool.kind])} />
          ))}
        </svg>

        {won && !showCard && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <p className="rounded-2xl bg-background/70 px-5 py-2 font-display text-2xl font-bold text-gold" style={{ animation: "pop-in .4s ease-out" }}>{t("awakening")}</p>
          </div>
        )}
        {showCard && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/70 p-4 backdrop-blur-sm" style={{ animation: "pop-in .4s ease-out" }}>
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-3xl bg-card-grad p-6 text-center shadow-chunky">
              <div className="flex gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn("h-12 w-12", n <= stars ? "fill-gold text-gold" : "text-muted-foreground")} />)}</div>
              <p className="font-display text-2xl font-bold">{t("spaceWinSay")}</p>
              <div className="rounded-2xl bg-muted p-3 text-left">
                <p className="text-sm font-bold uppercase text-secondary">{t("scienceFact")}</p>
                <p className="text-lg">{t(FACT_KEY[level.fact])}</p>
              </div>
              <div className="flex gap-2">
                <ChunkyButton onClick={() => { reset(); setHistory([]); }} size="md">{t("replay")}</ChunkyButton>
                {nextId ? (
                  <Link to="/space/$levelId" params={{ levelId: String(nextId) }} className={chunky({ variant: "gold", size: "md" })}>{t("next")}</Link>
                ) : (
                  <Link to="/space" className={chunky({ variant: "gold", size: "md" })}>{t("levels")}</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {kinds.map((k) => (
          <button key={k} onClick={() => { setArmed(armed === k ? null : k); setSelected(null); }} disabled={left(k) <= 0}
            aria-pressed={armed === k} aria-label={`${t(TOOL_KEY[k])} (${left(k)})`}
            className={cn(chunky({ variant: armed === k ? "gold" : "soft", size: "md" }), "relative h-20 flex-col gap-0 px-4 text-sm")}>
            <ToolIcon kind={k} />
            {t(TOOL_KEY[k])}
            <span className="absolute -right-2 -top-2 rounded-full bg-secondary px-2 text-sm text-secondary-foreground">{left(k)}</span>
          </button>
        ))}
        {sel && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted p-2">
            <ChunkyButton onClick={() => turn(-5)} aria-label={t("turnLeft")}><RotateCcw /></ChunkyButton>
            <span className="w-14 text-center text-xl font-bold tabular-nums">{Math.round(sel.angle)}°</span>
            <ChunkyButton onClick={() => turn(5)} aria-label={t("turnRight")}><RotateCw /></ChunkyButton>
            <ChunkyButton variant="danger" onClick={remove} aria-label={t("removeTool")}><Trash2 /></ChunkyButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Defs({ level }: { level: Level }) {
  return (
    <defs>
      <radialGradient id="space-bg" cx="50%" cy="40%" r="75%">
        <stop offset="0" stopColor="var(--card)" /><stop offset="1" stopColor="var(--space-deep)" />
      </radialGradient>
      <pattern id="stars" width="160" height="160" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="30" r="1.6" fill="var(--beam-white)" /><circle cx="110" cy="70" r="1" fill="var(--beam-white)" />
        <circle cx="70" cy="140" r="1.3" fill="var(--beam-white)" /><circle cx="140" cy="10" r="0.9" fill="var(--beam-white)" />
      </pattern>
      <radialGradient id="sun-glow"><stop offset="0.3" stopColor="var(--sun-glow)" stopOpacity="0.9" /><stop offset="1" stopColor="var(--sun-glow)" stopOpacity="0" /></radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      {level.planets.map((p, i) => (
        <g key={i}>
          <radialGradient id={`pl-${i}`} cx="35%" cy="30%"><stop offset="0" stopColor={`var(--${p.look}-a)`} /><stop offset="1" stopColor={`var(--${p.look}-b)`} /></radialGradient>
        </g>
      ))}
      <radialGradient id="pl-dull" cx="35%" cy="30%"><stop offset="0" stopColor="var(--rock-a)" /><stop offset="1" stopColor="var(--rock-b)" /></radialGradient>
      <radialGradient id="bh"><stop offset="0.35" stopColor="var(--space-deep)" /><stop offset="0.6" stopColor="var(--hole-ring)" stopOpacity="0.8" /><stop offset="1" stopColor="var(--hole-ring)" stopOpacity="0" /></radialGradient>
      <radialGradient id="wh"><stop offset="0.3" stopColor="var(--beam-white)" /><stop offset="1" stopColor="var(--beam-blue)" stopOpacity="0" /></radialGradient>
    </defs>
  );
}

function PlanetView({ p, lit, idx, t }: { p: Planet; lit: boolean; idx: number; t: (k: TKey, v?: Record<string, string | number>) => string }) {
  const label = p.need === "any" ? undefined : t("needs", { c: t(COL_KEY[p.need]) });
  const o = { transformOrigin: `${p.x}px ${p.y}px` };
  const ring = (front: boolean) => (
    <path d={front ? `M${p.x - p.r * 1.8} ${p.y} A${p.r * 1.8} ${p.r * 0.45} 0 0 0 ${p.x + p.r * 1.8} ${p.y}` : `M${p.x - p.r * 1.8} ${p.y} A${p.r * 1.8} ${p.r * 0.45} 0 0 1 ${p.x + p.r * 1.8} ${p.y}`}
      fill="none" stroke={`var(--${p.look}-a)`} strokeWidth="7" opacity={front ? 0.95 : 0.55} transform={`rotate(-18 ${p.x} ${p.y})`} />
  );
  return (
    <g pointerEvents="none" aria-label={label} data-planet={idx} data-lit={lit}>
      {lit && <circle cx={p.x} cy={p.y} r={p.r + 26} fill={`var(--${p.look}-a)`} opacity="0.35" filter="url(#glow)" />}
      {p.need !== "any" && (
        <circle cx={p.x} cy={p.y} r={p.r + 10} fill="none" stroke={BEAM[p.need]} strokeWidth="5" strokeDasharray="10 8"
          style={{ ...o, animation: "spin 12s linear infinite" }} />
      )}
      {lit && <g style={{ ...o, animation: "ring-in .7s ease-out" }}>{ring(false)}</g>}
      <circle cx={p.x} cy={p.y} r={p.r} fill={lit ? `url(#pl-${idx})` : "url(#pl-dull)"} />
      {!lit && [[-0.35, 0.2, 0.22], [0.3, -0.3, 0.16], [0.25, 0.4, 0.12], [-0.1, -0.45, 0.1]].map(([dx, dy, r], i) => (
        <circle key={i} cx={p.x + dx! * p.r} cy={p.y + dy! * p.r} r={r! * p.r} fill="var(--crater)" opacity=".7" />
      ))}
      {lit && (
        <path d={`M${p.x - p.r * 0.5} ${p.y - p.r * 0.2} q${p.r * 0.3} -${p.r * 0.5} ${p.r * 0.6} -${p.r * 0.1} t${p.r * 0.3} ${p.r * 0.4} q-${p.r * 0.4} ${p.r * 0.3} -${p.r * 0.9} -${p.r * 0.3}z`} fill={`var(--${p.look}-b)`} opacity=".8" />
      )}
      {lit && <g style={{ ...o, animation: "ring-in .7s ease-out" }}>{ring(true)}</g>}
      <circle cx={p.x - p.r * 0.35} cy={p.y - p.r * 0.35} r={p.r * 0.22} fill="var(--beam-white)" opacity={lit ? 0.45 : 0.1} />
    </g>
  );
}

function codexFor(level: Level): CodexId[] {
  const ids = new Set<CodexId>(["sun", "planet"]);
  for (const k of Object.keys(level.tray) as ToolKind[]) ids.add(k.startsWith("filter") ? "filter" : (k as CodexId));
  for (const f of level.fields) ids.add(f.kind);
  return [...ids];
}

function FieldView({ f, t }: { f: Level["fields"][number]; t: (k: TKey) => string }) {
  if (f.kind === "wind") {
    const lines = Array.from({ length: 5 }, (_, i) => f.x + ((i + 0.5) * f.w) / 5);
    return (
      <g aria-label={t("windStream")} pointerEvents="none">
        <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="var(--wind)" opacity="0.12" rx="30" />
        {lines.map((x, i) => (
          <path key={i} d={`M${x} ${f.y} q 18 40 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80 t 0 80`}
            fill="none" stroke="var(--wind)" strokeWidth="4" opacity="0.5" strokeDasharray="30 50" style={{ animation: `drift ${1.5 + i * 0.2}s linear infinite` }} />
        ))}
      </g>
    );
  }
  const black = f.kind === "blackhole";
  return (
    <g aria-label={t(black ? "blackHole" : "whiteHole")} pointerEvents="none"><HoleArt x={f.x} y={f.y} black={black} /></g>
  );
}

function ToolView({ tool, selected, locked, onBody, onHandle, label }: {
  tool: Tool; selected: boolean; locked: boolean; label: string;
  onBody: (e: RPE) => void; onHandle: (e: RPE) => void;
}) {
  const s = toolSegment(tool);
  const rad = (tool.angle * Math.PI) / 180;
  const reach = Math.max(TOOL_LEN[tool.kind] / 2, PRISM_R) + 26;
  const hx = tool.x + Math.cos(rad) * reach, hy = tool.y + Math.sin(rad) * reach;
  const fc = FILTER_COLOR[tool.kind];
  return (
    <g data-tool={tool.kind} aria-label={label} style={{ cursor: locked ? "default" : "grab" }}>
      {selected && (
        <g pointerEvents="none">
          <circle cx={tool.x} cy={tool.y} r={reach} fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.8" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180, r1 = reach - (i % 6 === 0 ? 14 : 7);
            return <line key={i} x1={tool.x + Math.cos(a) * r1} y1={tool.y + Math.sin(a) * r1} x2={tool.x + Math.cos(a) * reach} y2={tool.y + Math.sin(a) * reach} stroke="var(--gold)" strokeWidth="2" />;
          })}
          <text x={tool.x} y={tool.y - reach - 12} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--gold)">{Math.round(tool.angle)}°</text>
        </g>
      )}
      <circle cx={tool.x} cy={tool.y} r={reach - 20} fill="transparent" onPointerDown={onBody} />
      {tool.kind === "prism" ? (
        <polygon onPointerDown={onBody}
          points={[0, 120, 240].map((d) => { const a = rad + (d * Math.PI) / 180; return `${tool.x + Math.cos(a) * PRISM_R * 1.25},${tool.y + Math.sin(a) * PRISM_R * 1.25}`; }).join(" ")}
          fill="var(--mirror)" fillOpacity="0.25" stroke="var(--mirror)" strokeWidth="5" strokeLinejoin="round" />
      ) : tool.kind === "lens" ? (
        <path onPointerDown={onBody} fill="var(--beam-blue)" fillOpacity="0.35" stroke="var(--mirror)" strokeWidth="3"
          d={(() => { const nx = -Math.sin(rad) * 18, ny = Math.cos(rad) * 18, mx = tool.x, my = tool.y;
            return `M${s.a.x} ${s.a.y} Q${mx + nx * 2} ${my + ny * 2} ${s.b.x} ${s.b.y} Q${mx - nx * 2} ${my - ny * 2} ${s.a.x} ${s.a.y}Z`; })()} />
      ) : (
        <line onPointerDown={onBody} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y}
          stroke={fc ? BEAM[fc] : "var(--mirror)"} strokeWidth={tool.kind === "mirror" ? 10 : 8} strokeLinecap="round"
          strokeDasharray={tool.kind === "splitter" ? "14 8" : undefined} opacity={fc ? 0.85 : 1} />
      )}
      {!locked && (
        <circle cx={hx} cy={hy} r={selected ? 16 : 11} fill="var(--beam-white)" stroke="var(--gold)" strokeWidth="4" onPointerDown={onHandle} style={{ cursor: "alias" }} />
      )}
    </g>
  );
}

function ToolIcon({ kind }: { kind: ToolKind }) {
  const fc = FILTER_COLOR[kind];
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
      {kind === "prism" ? <polygon points="20,5 36,34 4,34" fill="none" stroke="currentColor" strokeWidth="3" />
        : kind === "lens" ? <ellipse cx="20" cy="20" rx="7" ry="16" fill="var(--beam-blue)" fillOpacity="0.4" stroke="currentColor" strokeWidth="2.5" />
        : <line x1="6" y1="32" x2="34" y2="8" stroke={fc ? BEAM[fc] : "currentColor"} strokeWidth="5" strokeLinecap="round" strokeDasharray={kind === "splitter" ? "6 4" : undefined} />}
    </svg>
  );
}
