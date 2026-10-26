import { describe, expect, it } from "vitest";
import { applyMirrorAction, nextGameplayHint, type Level } from "./engine";

const level: Level = {
  id: 1, cls: 3, width: 5, height: 5, inventory: 1,
  sources: [{ x: 0, y: 2, dir: "right", color: "gold" }],
  stars: [{ x: 2, y: 0, color: "gold" }], walls: [[1, 1]],
  solution: [{ x: 2, y: 2, type: "/" }],
};

describe("mirror controls", () => {
  it("places the selected orientation on a valid cell", () => {
    expect(applyMirrorAction(level, {}, { kind: "place", x: 2, y: 2, type: "\\" })).toEqual({ "2,2": "\\" });
  });
  it("rejects walls, emitters, targets and cells outside the board", () => {
    const board = {};
    for (const [x, y] of [[1, 1], [0, 2], [2, 0], [-1, 0], [5, 2]] as [number, number][]) {
      expect(applyMirrorAction(level, board, { kind: "place", x, y, type: "/" })).toBe(board);
    }
  });
  it("does not exceed the available inventory", () => {
    const board = { "2,2": "/" as const };
    expect(applyMirrorAction(level, board, { kind: "place", x: 3, y: 3, type: "/" })).toBe(board);
  });
  it("rotates a mirror without mutating the previous undo snapshot", () => {
    const before = { "2,2": "/" as const };
    expect(applyMirrorAction(level, before, { kind: "rotate", from: "2,2" })).toEqual({ "2,2": "\\" });
    expect(before).toEqual({ "2,2": "/" });
  });
  it("moves an existing mirror even when inventory is exhausted", () => {
    expect(applyMirrorAction(level, { "3,3": "\\" }, { kind: "move", from: "3,3", x: 2, y: 2 })).toEqual({ "2,2": "\\" });
  });
  it("invalid and occupied drops leave the board unchanged", () => {
    const board = { "2,2": "/" as const, "3,3": "\\" as const };
    expect(applyMirrorAction(level, board, { kind: "move", from: "2,2", x: 1, y: 1 })).toBe(board);
    expect(applyMirrorAction(level, board, { kind: "move", from: "2,2", x: 3, y: 3 })).toBe(board);
  });
  it("removal returns the mirror to inventory", () => {
    expect(applyMirrorAction(level, { "2,2": "/" }, { kind: "remove", from: "2,2" })).toEqual({});
  });
});

describe("contextual hints", () => {
  it("points to the next missing solution mirror", () => {
    expect(nextGameplayHint(level, {})).toEqual({ x: 2, y: 2, kind: "place" });
  });
  it("requests rotation for a wrong orientation", () => {
    expect(nextGameplayHint(level, { "2,2": "\\" })).toEqual({ x: 2, y: 2, kind: "rotate" });
  });
  it("requests a mirror back when the inventory is full", () => {
    expect(nextGameplayHint(level, { "3,3": "/" })).toEqual({ x: 3, y: 3, kind: "remove" });
  });
  it("does not reveal another hint for a solved board", () => {
    expect(nextGameplayHint(level, { "2,2": "/" })).toBeNull();
  });
});