import { describe, expect, it } from "vitest";
import { getTemplate } from "../templates/catalog";
import { findAdjustableSlotAt } from "./hitTest";

// "Klassik": title2 is the price chip (square frame x 740, y 830, w 276,
// h 110), the photo box sits at the top and is movable too; bg/panel are not.
const template = getTemplate("klassik");
if (!template) throw new Error("Klassik-Vorlage fehlt");

describe("findAdjustableSlotAt", () => {
  it("finds the movable element under the tap", () => {
    expect(findAdjustableSlotAt(template, "square", {}, 860, 880)).toBe(
      "title2",
    );
  });

  it("includes generous touch padding around the frame", () => {
    expect(findAdjustableSlotAt(template, "square", {}, 720, 826)).toBe(
      "title2",
    );
  });

  it("picks the photo box in the photo area", () => {
    expect(findAdjustableSlotAt(template, "square", {}, 540, 300)).toBe(
      "photo",
    );
  });

  it("ignores locked decoration", () => {
    // Bottom-left of the panel: only the (locked) panel and background are
    // there, so nothing is selectable.
    expect(findAdjustableSlotAt(template, "square", {}, 540, 1070)).toBeNull();
  });

  it("respects the element's current adjustment", () => {
    const moved = { title2: { dx: 60, dy: 60, scale: 1 } };
    expect(findAdjustableSlotAt(template, "square", moved, 1050, 970)).toBe(
      "title2",
    );
  });
});
