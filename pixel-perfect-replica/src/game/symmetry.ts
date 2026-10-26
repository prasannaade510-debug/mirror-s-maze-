// Pure logic for Symmetry mode. Shapes are authored as full symmetric pictures;
// one half is shown, the child completes the other half.

export type Axis = "v" | "h" | "d";
export interface SymLevel {
  id: number;
  shape: "heart" | "butterfly" | "house" | "fish" | "arrow" | "wave";
  axis: Axis;
  rows: string[];
}

export const SYM_LEVELS: SymLevel[] = [
  { id: 1, shape: "heart", axis: "v", rows: [".XX..XX.", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX..."] },
  { id: 2, shape: "butterfly", axis: "v", rows: ["XX....XX", "XXX..XXX", ".XXXXXX.", "..XXXX..", ".XXXXXX.", "XX.XX.XX"] },
  { id: 3, shape: "house", axis: "v", rows: ["...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", ".XX..XX.", ".XXXXXX."] },
  { id: 4, shape: "fish", axis: "h", rows: [".XX....", "XXXX..X", "XXXXXXX", "XXXXXXX", "XXXX..X", ".XX...."] },
  { id: 5, shape: "arrow", axis: "d", rows: ["XXXX..", "XX....", "X.X...", "X..X..", "....X.", ".....X"] },
  { id: 6, shape: "wave", axis: "d", rows: [".XX...", "X..X..", "X...X.", ".X...X", "..X...", "...X.."] },
];

export const dims = (l: SymLevel) => ({ w: l.rows[0]?.length ?? 0, h: l.rows.length });
const k = (x: number, y: number) => `${x},${y}`;

/** Which side of the mirror line a cell is on: "given", "target" or "line" (diagonal only). */
export function sideOf(l: SymLevel, x: number, y: number): "given" | "target" | "line" {
  const { w, h } = dims(l);
  if (l.axis === "v") return x < w / 2 ? "given" : "target";
  if (l.axis === "h") return y < h / 2 ? "given" : "target";
  if (x === y) return "line";
  return y > x ? "given" : "target";
}

export function mirrorCell(l: SymLevel, x: number, y: number): [number, number] {
  const { w, h } = dims(l);
  if (l.axis === "v") return [w - 1 - x, y];
  if (l.axis === "h") return [x, h - 1 - y];
  return [y, x];
}

function cells(l: SymLevel, side: "given" | "target" | "line"): Set<string> {
  const s = new Set<string>();
  l.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === "X" && sideOf(l, x, y) === side) s.add(k(x, y));
    }),
  );
  return s;
}

export const givenCells = (l: SymLevel) => new Set([...cells(l, "given"), ...cells(l, "line")]);
export const targetCells = (l: SymLevel) => cells(l, "target");

export function checkSymmetry(l: SymLevel, filled: Set<string>) {
  const target = targetCells(l);
  const correct = new Set([...filled].filter((c) => target.has(c)));
  const done = correct.size === target.size && filled.size === target.size;
  return { correct, done };
}
