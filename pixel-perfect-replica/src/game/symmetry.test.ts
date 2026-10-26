import { describe, expect, it } from "vitest";
import { SYM_LEVELS, checkSymmetry, givenCells, mirrorCell, targetCells } from "./symmetry";

describe("symmetry levels", () => {
  for (const l of SYM_LEVELS) {
    it(`${l.shape} is truly symmetric and has a non-empty target`, () => {
      const target = targetCells(l);
      expect(target.size).toBeGreaterThan(0);
      for (const c of givenCells(l)) {
        const [x = 0, y = 0] = c.split(",").map(Number);
        const [mx, my] = mirrorCell(l, x, y);
        expect(l.rows[my]?.[mx]).toBe("X");
      }
    });
    it(`${l.shape} is done only with the exact reflection`, () => {
      const target = targetCells(l);
      expect(checkSymmetry(l, target).done).toBe(true);
      const extra = new Set(target);
      extra.add("999,999");
      expect(checkSymmetry(l, extra).done).toBe(false);
      const missing = new Set([...target].slice(1));
      expect(checkSymmetry(l, missing).done).toBe(false);
    });
  }
});
