import { describe, expect, it } from "vitest";
import { sampleTemplate } from "../templates/sample";
import { findAdjustableSlotAt } from "./hitTest";

// In the sample template only "price" declares guardrails
// (square frame: x 760, y 820, w 256, h 110).

describe("findAdjustableSlotAt", () => {
  it("finds the adjustable element under the tap", () => {
    expect(findAdjustableSlotAt(sampleTemplate, "square", {}, 880, 875)).toBe(
      "price",
    );
  });

  it("includes generous touch padding around the frame", () => {
    expect(findAdjustableSlotAt(sampleTemplate, "square", {}, 745, 815)).toBe(
      "price",
    );
  });

  it("ignores locked elements", () => {
    // Center of the headline (locked): no hit.
    expect(
      findAdjustableSlotAt(sampleTemplate, "square", {}, 400, 700),
    ).toBeNull();
  });

  it("respects the element's current adjustment", () => {
    const moved = { price: { dx: 60, dy: 60, scale: 1 } };
    expect(
      findAdjustableSlotAt(sampleTemplate, "square", moved, 1050, 950),
    ).toBe("price");
  });
});
