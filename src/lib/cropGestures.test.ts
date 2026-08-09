import { describe, expect, it } from "vitest";
import { MIN_ZOOM } from "../engine/geometry";
import { DEFAULT_CROP } from "../engine/types";
import { panCrop, zoomCrop } from "./cropGestures";

// Landscape image in a square frame: coverScale = 1, overflowX = 500.
const IMG_W = 2000;
const IMG_H = 1000;
const FRAME = 1000;

describe("panCrop", () => {
  it("dragging right shows more of the image's left side", () => {
    const crop = panCrop(DEFAULT_CROP, 100, 0, IMG_W, IMG_H, FRAME, FRAME);
    // 100px drag over 500px of hidden image.
    expect(crop.offsetX).toBeCloseTo(-0.2);
    expect(crop.offsetY).toBe(0);
  });

  it("does not pan on an axis without room to move", () => {
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
    // At zoom 2 the image is 4000×2000 → 500px of it hidden per side.
    expect(crop.offsetY).toBeCloseTo(-0.2);
  });

  it("moves a shrunk image with the finger, in drag direction", () => {
    // zoom 0.5 → 1000×500 image in a 1000px frame: 250px of gap per side.
    const shrunk = { zoom: 0.5, offsetX: 0, offsetY: 0 };
    const crop = panCrop(shrunk, 0, 100, IMG_W, IMG_H, FRAME, FRAME);
    // Dragging down by 100 of the 250px gap moves it toward the bottom edge.
    expect(crop.offsetY).toBeCloseTo(0.4);
  });

  it("keeps a shrunk image inside the frame", () => {
    const shrunk = { zoom: 0.5, offsetX: 0, offsetY: 0 };
    const crop = panCrop(shrunk, 0, 9999, IMG_W, IMG_H, FRAME, FRAME);
    expect(crop.offsetY).toBe(1);
  });
});

describe("zoomCrop", () => {
  it("multiplies zoom by the given factor", () => {
    expect(zoomCrop(DEFAULT_CROP, 1.5).zoom).toBeCloseTo(1.5);
  });

  it("zooms out below the cover fit", () => {
    expect(zoomCrop(DEFAULT_CROP, 0.5).zoom).toBeCloseTo(0.5);
  });

  it("clamps zoom to the legal range", () => {
    expect(zoomCrop(DEFAULT_CROP, 0.01).zoom).toBe(MIN_ZOOM);
    expect(zoomCrop({ ...DEFAULT_CROP, zoom: 2.5 }, 2).zoom).toBe(3);
  });

  it("ignores degenerate factors", () => {
    expect(zoomCrop(DEFAULT_CROP, 0)).toEqual(DEFAULT_CROP);
    expect(zoomCrop(DEFAULT_CROP, Number.NaN)).toEqual(DEFAULT_CROP);
  });
});
