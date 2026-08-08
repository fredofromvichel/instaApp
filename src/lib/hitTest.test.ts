import { describe, expect, it } from "vitest";
import { productTemplates } from "../templates/products";
import { findAdjustableSlotAt } from "./hitTest";

// "Klassik" template: the price slot declares guardrails
// (square frame: x 740, y 830, w 276, h 110). The photo area is locked.
const template = productTemplates[0];
if (!template) throw new Error("products set is empty");

describe("findAdjustableSlotAt", () => {
  it("finds the adjustable element under the tap", () => {
    expect(findAdjustableSlotAt(template, "square", {}, 860, 880)).toBe(
      "price",
    );
  });

  it("includes generous touch padding around the frame", () => {
    expect(findAdjustableSlotAt(template, "square", {}, 720, 826)).toBe(
      "price",
    );
  });

  it("ignores locked elements", () => {
    // Middle of the (locked) photo area: no adjustable hit.
    expect(findAdjustableSlotAt(template, "square", {}, 540, 300)).toBeNull();
  });

  it("respects the element's current adjustment", () => {
    const moved = { price: { dx: 60, dy: 60, scale: 1 } };
    expect(findAdjustableSlotAt(template, "square", moved, 1050, 970)).toBe(
      "price",
    );
  });
});
