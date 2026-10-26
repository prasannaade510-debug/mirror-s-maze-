/** Pure free-angle light physics for the Space mode. No React. Board units: 0..W, 0..H, y grows down. */
export const W = 1000;
export const H = 1000;

export type Color = "white" | "red" | "green" | "blue";
export type Need = "any" | Exclude<Color, "white">;
export type ToolKind = "mirror" | "prism" | "lens" | "splitter" | "filterRed" | "filterGreen" | "filterBlue";
export type PlanetLook = "earth" | "mars" | "ice" | "jungle" | "ocean" | "ringed";

export interface Vec { x: number; y: number }
export interface Tool { id: string; kind: ToolKind; x: number; y: number; angle: number; fixed?: boolean }
export interface Planet { x: number; y: number; r: number; need: Need; look: PlanetLook }
export interface Wall { a: Vec; b: Vec }
export type Field =
  | { kind: "blackhole"; x: number; y: number; mass: number }
  | { kind: "whitehole"; x: number; y: number; mass: number }
  | { kind: "wind"; x: number; y: number; w: number; h: number; fx: number; fy: number };

export interface Level {
  id: number;
  sun: { x: number; y: number; angle: number };
  planets: Planet[];
  walls: Wall[];
  fields: Field[];
  fixed: Tool[];
  tray: Partial<Record<ToolKind, number>>;
  fact: "reflect" | "lens" | "prism" | "gravity" | "split" | "filter" | "wind" | "whitehole" | "grand";
  solution: Tool[];
}

export const TOOL_LEN: Record<ToolKind, number> = {
  mirror: 110, prism: 0, lens: 130, splitter: 110, filterRed: 100, filterGreen: 100, filterBlue: 100,
};
export const PRISM_R = 34;
export const CORE_R = 26;
export const LENS_F = 160;
/** Real dispersion: blue bends most, red least. */
export const DEVIATION: Record<Exclude<Color, "white">, number> = { red: 16, green: 23, blue: 30 };

export interface Ray { color: Color; points: Vec[] }
export interface Trace { rays: Ray[]; lit: boolean[]; won: boolean }

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number): Vec => ({ x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) });
const norm = (v: Vec): Vec => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; };
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const rotate = (v: Vec, deg: number): Vec => {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

export function toolSegment(t: Tool): Wall {
  const half = TOOL_LEN[t.kind] / 2, d = dir(t.angle);
  return { a: { x: t.x - d.x * half, y: t.y - d.y * half }, b: { x: t.x + d.x * half, y: t.y + d.y * half } };
}

/** Mirror law: angle in = angle out. */
export function reflect(d: Vec, segDir: Vec): Vec {
  const n = { x: -segDir.y, y: segDir.x };
  const k = 2 * dot(d, n);
  return norm({ x: d.x - k * n.x, y: d.y - k * n.y });
}

/** Thin lens: a ray hitting h away from the centre turns by h/f toward the axis. */
export function lensBend(d: Vec, segDir: Vec, h: number, f = LENS_F): Vec {
  let n = { x: -segDir.y, y: segDir.x };
  if (dot(d, n) < 0) n = { x: -n.x, y: -n.y };
  const slope = dot(d, segDir) / dot(d, n) - h / f;
  return norm({ x: n.x + slope * segDir.x, y: n.y + slope * segDir.y });
}

/** Prism bends light toward its base (away from the apex); each colour by its own amount. */
export function prismOut(d: Vec, apexAngle: number, color: Color): { color: Color; d: Vec }[] {
  const apex = dir(apexAngle);
  const cross = d.x * apex.y - d.y * apex.x;
  const sign = cross >= 0 ? -1 : 1;
  const colors: Exclude<Color, "white">[] = color === "white" ? ["red", "green", "blue"] : [color];
  return colors.map((c) => ({ color: c, d: norm(rotate(d, sign * DEVIATION[c])) }));
}

function segHit(p: Vec, q: Vec, s: Wall): { t: number; u: number } | null {
  const rx = q.x - p.x, ry = q.y - p.y, sx = s.b.x - s.a.x, sy = s.b.y - s.a.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const ax = s.a.x - p.x, ay = s.a.y - p.y;
  const t = (ax * sy - ay * sx) / den, u = (ax * ry - ay * rx) / den;
  return t > 1e-6 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}
function circleHit(p: Vec, q: Vec, c: Vec, r: number): number | null {
  const dx = q.x - p.x, dy = q.y - p.y, fx = p.x - c.x, fy = p.y - c.y;
  const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0 || a === 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 1e-6 && t <= 1 ? t : null;
}

const satisfies = (need: Need, c: Color) => need === "any" || need === c;
const FILTER: Partial<Record<ToolKind, Color>> = { filterRed: "red", filterGreen: "green", filterBlue: "blue" };

export function trace(level: Pick<Level, "sun" | "planets" | "walls" | "fields">, tools: Tool[]): Trace {
  const border: Wall[] = [
    { a: { x: 0, y: 0 }, b: { x: W, y: 0 } }, { a: { x: W, y: 0 }, b: { x: W, y: H } },
    { a: { x: W, y: H }, b: { x: 0, y: H } }, { a: { x: 0, y: H }, b: { x: 0, y: 0 } },
  ];
  const walls = [...level.walls, ...border];
  const segs = tools.filter((t) => t.kind !== "prism").map((t) => ({ t, s: toolSegment(t) }));
  const prisms = tools.filter((t) => t.kind === "prism");
  const lit = level.planets.map(() => false);
  const rays: Ray[] = [];
  const queue: { p: Vec; d: Vec; color: Color; skip?: string; depth: number }[] = [
    { p: { x: level.sun.x, y: level.sun.y }, d: dir(level.sun.angle), color: "white", depth: 0 },
  ];
  const curved = level.fields.length > 0;
  const STEP = curved ? 6 : 4000;
  let budget = 40;

  while (queue.length && budget-- > 0) {
    const r = queue.shift()!;
    const ray: Ray = { color: r.color, points: [r.p] };
    rays.push(ray);
    let p = r.p, d = r.d, skip = r.skip, travelled = 0;
    for (let i = 0; i < 2000 && travelled < 9000; i++) {
      const q = { x: p.x + d.x * STEP, y: p.y + d.y * STEP };
      type HitT = { t: number; kind: "wall" | "tool" | "prism" | "planet" | "core"; tool?: Tool; u?: number; planet?: number };
      let best: HitT | null = null;
      const take = (h: HitT) => { if (!best || h.t < best.t) best = h; };
      for (const w of walls) { const h = segHit(p, q, w); if (h) take({ t: h.t, kind: "wall" }); }
      for (const { t, s } of segs) {
        if (t.id === skip) continue;
        const h = segHit(p, q, s); if (h) take({ t: h.t, kind: "tool", tool: t, u: h.u });
      }
      for (const t of prisms) {
        if (t.id === skip) continue;
        const h = circleHit(p, q, t, PRISM_R); if (h !== null) take({ t: h, kind: "prism", tool: t });
      }
      level.planets.forEach((pl, idx) => { const h = circleHit(p, q, pl, pl.r); if (h !== null) take({ t: h, kind: "planet", planet: idx }); });
      for (const f of level.fields) if (f.kind !== "wind") { const h = circleHit(p, q, f, CORE_R); if (h !== null) take({ t: h, kind: "core" }); }

      const hit = best as HitT | null;
      if (!hit) {
        travelled += STEP; p = q; ray.points.push(p); skip = undefined;
        if (curved) d = bend(level.fields, p, d, STEP);
        continue;
      }
      const hp = { x: p.x + (q.x - p.x) * hit.t, y: p.y + (q.y - p.y) * hit.t };
      ray.points.push(hp);
      if (hit.kind === "planet") { if (satisfies(level.planets[hit.planet!]!.need, r.color)) lit[hit.planet!] = true; break; }
      if (hit.kind === "wall" || hit.kind === "core") break;
      const tool = hit.tool!;
      if (r.depth > 14) break;
      if (hit.kind === "prism") {
        const c = { x: tool.x, y: tool.y };
        for (const o of prismOut(d, tool.angle, r.color))
          queue.push({ p: { x: c.x + o.d.x * (PRISM_R + 1), y: c.y + o.d.y * (PRISM_R + 1) }, d: o.d, color: o.color, skip: tool.id, depth: r.depth + 1 });
        break;
      }
      const sd = dir(tool.angle);
      if (tool.kind === "mirror") { d = reflect(d, sd); p = hp; skip = tool.id; continue; }
      if (tool.kind === "lens") {
        const h = (hit.u! - 0.5) * TOOL_LEN.lens;
        d = lensBend(d, sd, h); p = hp; skip = tool.id; continue;
      }
      if (tool.kind === "splitter") {
        queue.push({ p: hp, d: reflect(d, sd), color: r.color, skip: tool.id, depth: r.depth + 1 });
        p = hp; skip = tool.id; continue;
      }
      const fc = FILTER[tool.kind]!;
      if (r.color === "white" || r.color === fc) {
        queue.push({ p: hp, d, color: fc, skip: tool.id, depth: r.depth + 1 });
      }
      break;
    }
  }
  return { rays, lit, won: lit.every(Boolean) };
}

/** Gravity pulls light toward black holes, pushes it from white holes; wind drifts it sideways. */
function bend(fields: Field[], p: Vec, d: Vec, step: number): Vec {
  let ax = 0, ay = 0;
  for (const f of fields) {
    if (f.kind === "wind") {
      if (p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h) { ax += f.fx; ay += f.fy; }
      continue;
    }
    const dx = f.x - p.x, dy = f.y - p.y, r2 = Math.max(dx * dx + dy * dy, 400), r = Math.sqrt(r2);
    const s = (f.kind === "blackhole" ? 1 : -1) * f.mass / r2;
    ax += (s * dx) / r; ay += (s * dy) / r;
  }
  return norm({ x: d.x + ax * step, y: d.y + ay * step });
}

/** Stars: 3 when using at most the solution's tool count, 2 for one extra, else 1. */
export function starsFor(used: number, par: number): 1 | 2 | 3 {
  return used <= par ? 3 : used === par + 1 ? 2 : 1;
}

export function canPlaceAt(level: Pick<Level, "planets" | "sun" | "fields">, x: number, y: number): boolean {
  if (x < 20 || y < 20 || x > W - 20 || y > H - 20) return false;
  if (Math.hypot(x - level.sun.x, y - level.sun.y) < 50) return false;
  if (level.planets.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + 10)) return false;
  return !level.fields.some((f) => f.kind !== "wind" && Math.hypot(x - f.x, y - f.y) < CORE_R + 15);
}
