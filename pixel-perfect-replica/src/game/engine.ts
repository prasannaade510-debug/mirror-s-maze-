// Pure game logic for Mirror Maze. No React here.

export type MirrorType = "/" | "\\";
export type BeamColor = "gold" | "red" | "blue";
export type DirName = "up" | "down" | "left" | "right";
export interface Vec {
  dx: number;
  dy: number;
}
export interface Cell {
  x: number;
  y: number;
}
export interface Source extends Cell {
  dir: DirName;
  color: BeamColor;
}
export interface Star extends Cell {
  color: BeamColor;
}
export interface PlacedMirror extends Cell {
  type: MirrorType;
}
export interface Level {
  id: number;
  cls: 3 | 4 | 5;
  width: number;
  height: number;
  sources: Source[];
  stars: Star[];
  walls: [number, number][];
  /** Number of mirror tiles in the tray. */
  inventory: number;
  solution: PlacedMirror[];
  tutorial?: boolean;
  /** Show the gentle "right angle" hint text. */
  angleHint?: boolean;
}

export type MirrorMap = Record<string, MirrorType>;
export type EndReason = "edge" | "wall" | "star" | "loop";

export interface Bounce extends Cell {
  inDir: Vec;
  outDir: Vec;
}
export interface Trace {
  source: Source;
  /** Polyline points in cell units (cell centre = x + 0.5). */
  points: { x: number; y: number }[];
  bounces: Bounce[];
  hitStar: Star | null;
  end: EndReason;
  steps: number;
}

export const DIRS: Record<DirName, Vec> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const key = (x: number, y: number) => `${x},${y}`;

/** Reflection in screen coordinates (y grows downward). */
export function reflect(d: Vec, type: MirrorType): Vec {
  // Normalise -0 to 0 so results compare cleanly.
  const n = (v: number) => (v === 0 ? 0 : v);
  return type === "/" ? { dx: n(-d.dy), dy: n(-d.dx) } : { dx: n(d.dy), dy: n(d.dx) };
}

export function flip(type: MirrorType): MirrorType {
  return type === "/" ? "\\" : "/";
}

export function isBlockedCell(level: Level, x: number, y: number): boolean {
  return (
    level.walls.some(([wx, wy]) => wx === x && wy === y) ||
    level.sources.some((s) => s.x === x && s.y === y) ||
    level.stars.some((s) => s.x === x && s.y === y)
  );
}

export function canPlace(level: Level, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < level.width && y < level.height && !isBlockedCell(level, x, y);
}

export type MirrorAction =
  | { kind: "place"; x: number; y: number; type: MirrorType }
  | { kind: "rotate"; from: string }
  | { kind: "remove"; from: string }
  | { kind: "move"; from: string; x: number; y: number };

/** Invalid actions return the original board, so they never consume a move. */
export function applyMirrorAction(level: Level, mirrors: MirrorMap, action: MirrorAction): MirrorMap {
  if (action.kind === "rotate" || action.kind === "remove") {
    const type = mirrors[action.from];
    if (!type) return mirrors;
    const next = { ...mirrors };
    if (action.kind === "remove") delete next[action.from];
    else next[action.from] = flip(type);
    return next;
  }
  const destination = key(action.x, action.y);
  if (!canPlace(level, action.x, action.y) || mirrors[destination]) return mirrors;
  if (action.kind === "place") {
    if (Object.keys(mirrors).length >= level.inventory) return mirrors;
    return { ...mirrors, [destination]: action.type };
  }
  const type = mirrors[action.from];
  if (!type) return mirrors;
  const next = { ...mirrors, [destination]: type };
  delete next[action.from];
  return next;
}

export interface GameplayHint extends Cell {
  kind: "place" | "rotate" | "remove";
}

/** Reveal one actionable correction; a full tray first needs a spare mirror back. */
export function nextGameplayHint(level: Level, mirrors: MirrorMap): GameplayHint | null {
  if (evaluate(level, mirrors).solved) return null;
  const wrong = level.solution.find((s) => mirrors[key(s.x, s.y)] && mirrors[key(s.x, s.y)] !== s.type);
  if (wrong) return { x: wrong.x, y: wrong.y, kind: "rotate" };
  const missing = level.solution.find((s) => !mirrors[key(s.x, s.y)]);
  if (!missing) return null;
  if (Object.keys(mirrors).length >= level.inventory) {
    const extra = Object.keys(mirrors).find((k) => !level.solution.some((s) => key(s.x, s.y) === k));
    if (extra) {
      const [x = 0, y = 0] = extra.split(",").map(Number);
      return { x, y, kind: "remove" };
    }
  }
  return { x: missing.x, y: missing.y, kind: "place" };
}

export function traceBeam(level: Level, mirrors: MirrorMap, source: Source, maxSteps = 500): Trace {
  const walls = new Set(level.walls.map(([x, y]) => key(x, y)));
  let x = source.x;
  let y = source.y;
  let d = DIRS[source.dir];
  const points = [{ x: x + 0.5, y: y + 0.5 }];
  const bounces: Bounce[] = [];
  const seen = new Set<string>();
  let steps = 0;

  while (true) {
    if (steps >= maxSteps) return { source, points, bounces, hitStar: null, end: "loop", steps };
    const nx = x + d.dx;
    const ny = y + d.dy;
    steps++;
    if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) {
      points.push({ x: x + 0.5 + d.dx * 0.5, y: y + 0.5 + d.dy * 0.5 });
      return { source, points, bounces, hitStar: null, end: "edge", steps };
    }
    if (walls.has(key(nx, ny))) {
      points.push({ x: x + 0.5 + d.dx * 0.5, y: y + 0.5 + d.dy * 0.5 });
      return { source, points, bounces, hitStar: null, end: "wall", steps };
    }
    x = nx;
    y = ny;
    const star = level.stars.find((s) => s.x === x && s.y === y && s.color === source.color);
    if (star) {
      points.push({ x: x + 0.5, y: y + 0.5 });
      return { source, points, bounces, hitStar: star, end: "star", steps };
    }
    const m = mirrors[key(x, y)];
    if (m) {
      const out = reflect(d, m);
      bounces.push({ x, y, inDir: d, outDir: out });
      points.push({ x: x + 0.5, y: y + 0.5 });
      d = out;
    }
    const state = `${x},${y},${d.dx},${d.dy}`;
    if (seen.has(state)) {
      points.push({ x: x + 0.5, y: y + 0.5 });
      return { source, points, bounces, hitStar: null, end: "loop", steps };
    }
    seen.add(state);
  }
}

export interface Evaluation {
  traces: Trace[];
  solved: boolean;
}

export function evaluate(level: Level, mirrors: MirrorMap): Evaluation {
  const traces = level.sources.map((s) => traceBeam(level, mirrors, s));
  return { traces, solved: traces.every((t) => t.end === "star") };
}

export function mirrorsFromList(list: PlacedMirror[]): MirrorMap {
  const m: MirrorMap = {};
  for (const p of list) m[key(p.x, p.y)] = p.type;
  return m;
}

/** 3 stars when using no more mirrors than the reference solution. Never based on time. */
export function starsFor(level: Level, used: number): 1 | 2 | 3 {
  const best = level.solution.length;
  if (used <= best) return 3;
  if (used <= best + 1) return 2;
  return 1;
}
