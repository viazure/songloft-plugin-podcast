import { describe, expect, it } from "vitest";
import {
  planPinToFrontMotion,
  rowSlotsFromBoxes,
  settleTranslate,
} from "../ui/lib/queueDrag.js";

const ROW_BOXES = [
  { id: 1, top: 0, bottom: 80 },
  { id: 2, top: 80, bottom: 160 },
  { id: 3, top: 160, bottom: 240 },
];

describe("planPinToFrontMotion", () => {
  it("plans a visible move-to-front transition for a mid-list row", () => {
    const slots = rowSlotsFromBoxes(ROW_BOXES);
    const motion = planPinToFrontMotion(slots, 3);
    expect(motion.kind).toBe("move");
    expect(motion.fromIndex).toBe(2);
    expect(motion.toIndex).toBe(0);
    expect(motion.settle.y).toBeLessThan(0);
    expect(motion.settle.y).toBe(settleTranslate(slots, 3, 0).y);
    const shifted = (motion.shifts || []).filter((s) => !s.isDragged && s.y > 0);
    expect(shifted).toHaveLength(2);
    expect(shifted.every((s) => s.id === 1 || s.id === 2)).toBe(true);
  });

  it("is a no-op plan when the row is already first", () => {
    const motion = planPinToFrontMotion(rowSlotsFromBoxes(ROW_BOXES), 1);
    expect(motion.kind).toBe("already-first");
    expect(motion.settle).toEqual({ x: 0, y: 0 });
  });

  it("marks a missing row as insert so the panel can flash the new first item", () => {
    const motion = planPinToFrontMotion(rowSlotsFromBoxes(ROW_BOXES), 99);
    expect(motion.kind).toBe("insert");
    expect(motion.fromIndex).toBe(-1);
  });
});
