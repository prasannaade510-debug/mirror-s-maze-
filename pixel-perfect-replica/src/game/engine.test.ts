import { describe, expect, it } from "vitest";
import { DIRS, evaluate, mirrorsFromList, reflect, traceBeam, canPlace, type Level } from "./engine";
import { LEVELS } from "./levels";

const base = (over: Partial<Level> = {}): Level => ({
  id: 0, cls: 3, width: 5, height: 5,
  sources: [{ x: 0, y: 2, dir: "right", color: "gold" }],
  stars: [{ x: 4, y: 0, color: "gold" }],
  walls: [], inventory: 3, solution: [], ...over,
});

describe("reflect", () => {
  it("'/' mirror", () => {
    expect(reflect(DIRS.right, "/")).toEqual(DIRS.up);
    expect(reflect(DIRS.left, "/")).toEqual(DIRS.down);
    expect(reflect(DIRS.up, "/")).toEqual(DIRS.right);
    expect(reflect(DIRS.down, "/")).toEqual(DIRS.left);
  });
  it("'\\' mirror", () => {
    expect(reflect(DIRS.right, "\\")).toEqual(DIRS.down);
    expect(reflect(DIRS.left, "\\")).toEqual(DIRS.up);
    expect(reflect(DIRS.up, "\\")).toEqual(DIRS.left);
    expect(reflect(DIRS.down, "\\")).toEqual(DIRS.right);
  });
});

describe("traceBeam", () => {
  it("stops at the grid edge", () => {
    const t = traceBeam(base(), {}, base().sources[0]!);
    expect(t.end).toBe("edge");
    expect(t.points.at(-1)).toEqual({ x: 5, y: 2.5 });
  });
  it("stops at a wall", () => {
    const lv = base({ walls: [[3, 2]] });
    const t = traceBeam(lv, {}, lv.sources[0]!);
    expect(t.end).toBe("wall");
    expect(t.points.at(-1)).toEqual({ x: 3, y: 2.5 });
  });
  it("detects the star", () => {
    const lv = base();
    const t = traceBeam(lv, mirrorsFromList([{ x: 4, y: 2, type: "/" }]), lv.sources[0]!);
    expect(t.end).toBe("star");
    expect(t.bounces).toHaveLength(1);
  });
  it("passes through a star of a different colour", () => {
    const lv = base({ stars: [{ x: 3, y: 2, color: "blue" }] });
    expect(traceBeam(lv, {}, lv.sources[0]!).end).toBe("edge");
  });
  it("protects against loops", () => {
    const looped = traceBeam(
      base({ sources: [{ x: 2, y: 1, dir: "right", color: "gold" }], stars: [] }),
      mirrorsFromList([{ x: 3, y: 1, type: "\\" }, { x: 3, y: 3, type: "/" }, { x: 1, y: 3, type: "\\" }, { x: 1, y: 1, type: "/" }]),
      { x: 2, y: 1, dir: "right", color: "gold" },
    );
    expect(looped.end).toBe("loop");
  });
  it("cannot place on walls, sources or stars", () => {
    const lv = base({ walls: [[1, 1]] });
    expect(canPlace(lv, 1, 1)).toBe(false);
    expect(canPlace(lv, 0, 2)).toBe(false);
    expect(canPlace(lv, 4, 0)).toBe(false);
    expect(canPlace(lv, 2, 2)).toBe(true);
  });
});

describe("levels", () => {
  it("has 40 levels grouped by class", () => {
    expect(LEVELS).toHaveLength(40);
    expect(LEVELS.filter((l) => l.cls === 3)).toHaveLength(10);
    expect(LEVELS.filter((l) => l.cls === 4)).toHaveLength(10);
    expect(LEVELS.filter((l) => l.cls === 5)).toHaveLength(20);
  });
  for (const lv of LEVELS) {
    it(`level ${lv.id} solution reaches every star`, () => {
      expect(lv.solution.length).toBeLessThanOrEqual(lv.inventory);
      for (const m of lv.solution) expect(canPlace(lv, m.x, m.y)).toBe(true);
      expect(evaluate(lv, mirrorsFromList(lv.solution)).solved).toBe(true);
    });
    it(`level ${lv.id} is not solved with no mirrors`, () => {
      expect(evaluate(lv, {}).solved).toBe(false);
    });
  }
});
