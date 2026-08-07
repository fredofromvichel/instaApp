import { describe, expect, it } from "vitest";
import { DEFAULT_CROP } from "../engine/types";
import { panCrop, pinchCrop } from "./cropGestures";

// Landscape image in a square frame: coverScale = 1, leftoverX = 500.
const IMG_W = 2000;
const IMG_H = 1000;
const FRAME = 1000;

describe("panCrop", () => {
  it("dragging right shows more of the image's left side", () => {
    const crop = panCrop(DEFAULT_CROP, 100, 0, IMG_W, IMG_H, FRAME, FRAME);
    // scale = 1 canvas px per source px → 100px drag over 500px leftover.
    expect(crop.offsetX).toBeCloseTo(-0.2);
    expect(crop.offsetY).toBe(0);
  });

  it("does not pan on an axis without leftover image", () => {
    const crop = panCrop(DEFAULT_CROP, 0, 80, IMG_W, IMG_H, FRAME, FRAME);
    expect(crop.offsetY).toBe(0);
  });

  it("clamps panning at the image edge", () => {
    const crop = panCrop(DEFAULT_CROP, 9999, 0, IMG_W, IMG_H, FRAME, FRAME);
    expect(crop.offsetX).toBe(-1);
  });

  it("pans vertically once zoomed in", () => {
    const zoomed = { zoom: 2, offsetX: 0, offsetY: 0 };
    const crop = panCrop(zoomed, 0, 100, IMG_W, IMG_H, FRAME, FRAME);
    // At zoom 2: sh = 500, leftoverY = 250, scale = 2 → 100/2/250 = 0.2.
    expect(crop.offsetY).toBeCloseTo(-0.2);
  });
});

describe("pinchCrop", () => {
  it("multiplies zoom by the pinch ratio", () => {
    expect(pinchCrop(DEFAULT_CROP, 1.5).zoom).toBeCloseTo(1.5);
  });

  it("clamps zoom to the legal range", () => {
    expect(pinchCrop(DEFAULT_CROP, 0.1).zoom).toBe(1);
    expect(pinchCrop({ ...DEFAULT_CROP, zoom: 2.5 }, 2).zoom).toBe(3);
  });

  it("ignores degenerate ratios", () => {
    expect(pinchCrop(DEFAULT_CROP, 0)).toEqual(DEFAULT_CROP);
    expect(pinchCrop(DEFAULT_CROP, Number.NaN)).toEqual(DEFAULT_CROP);
  });
});
