import { describe, expect, it } from "vitest";
import { DEVIATION, lensBend, prismOut, reflect, starsFor, trace } from "./optics";
import { SPACE_LEVELS } from "./spaceLevels";

describe("optics", () => {
  it("45° mirror turns a rightward beam straight down", () => {
    const d = reflect({ x: 1, y: 0 }, { x: Math.SQRT1_2, y: Math.SQRT1_2 });
    expect(d.x).toBeCloseTo(0); expect(d.y).toBeCloseTo(1);
  });
  it("lens centre does not bend; off-centre bends toward axis", () => {
    expect(lensBend({ x: 1, y: 0 }, { x: 0, y: 1 }, 0).y).toBeCloseTo(0);
    expect(lensBend({ x: 1, y: 0 }, { x: 0, y: 1 }, 50).y).toBeLessThan(0);
  });
  it("prism splits white into three colours, blue bending most", () => {
    const out = prismOut({ x: 1, y: 0 }, -90, "white");
    expect(out.map((o) => o.color)).toEqual(["red", "green", "blue"]);
    expect(DEVIATION.blue).toBeGreaterThan(DEVIATION.red);
    expect(Math.abs(out[2]!.d.y)).toBeGreaterThan(Math.abs(out[0]!.d.y));
  });
  it("nothing placed means no planet lit on level 1", () => {
    expect(trace(SPACE_LEVELS[0]!, []).won).toBe(false);
  });
  it("stars: par = 3, one extra = 2, more = 1", () => {
    expect([starsFor(1, 1), starsFor(2, 1), starsFor(3, 1)]).toEqual([3, 2, 1]);
  });
  it("ships at least 32 worlds, later ones with several planets", () => {
    expect(SPACE_LEVELS.length).toBeGreaterThanOrEqual(32);
    expect(SPACE_LEVELS.filter((l) => l.planets.length >= 3).length).toBeGreaterThanOrEqual(7);
  });
  it.each(SPACE_LEVELS.map((l) => [l.id, l] as const))("space level %i planets fit fully on the board and sun alone wakes none", (_id, l) => {
    for (const p of l.planets) { expect(p.x - p.r).toBeGreaterThan(0); expect(p.y - p.r).toBeGreaterThan(0); expect(p.x + p.r).toBeLessThan(1000); expect(p.y + p.r).toBeLessThan(1000); }
    expect(trace(l, l.fixed).won).toBe(false);
  });
  it.each(SPACE_LEVELS.map((l) => [l.id, l] as const))("space level %i solution lights every planet", (_id, l) => {
    expect(trace(l, [...l.fixed, ...l.solution]).won).toBe(true);
  });
});
