import { describe, expect, it } from "vitest";
import {
  applyAdjustment,
  clampAdjustment,
  clampCrop,
  computePhotoPlacement,
  containFit,
  coversFrame,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./geometry";
import { DEFAULT_CROP, LOCKED } from "./types";

const SQUARE = { x: 0, y: 0, w: 1000, h: 1000 };

describe("computePhotoPlacement", () => {
  it("fills the frame exactly when aspect ratios match at zoom 1", () => {
    expect(
      computePhotoPlacement(
        1000,
        1000,
        { x: 0, y: 0, w: 500, h: 500 },
        DEFAULT_CROP,
      ),
    ).toEqual({ x: 0, y: 0, w: 500, h: 500 });
  });

  it("center-crops a landscape image in a square frame", () => {
    // coverScale = max(1000/2000, 1000/1000) = 1 → 2000×1000 centered
    expect(computePhotoPlacement(2000, 1000, SQUARE, DEFAULT_CROP)).toEqual({
      x: -500,
      y: 0,
      w: 2000,
      h: 1000,
    });
  });

  it("pans to the image edges at offset -1 and +1, never beyond", () => {
    const left = computePhotoPlacement(2000, 1000, SQUARE, {
      zoom: 1,
      offsetX: -1,
      offsetY: 0,
    });
    expect(left.x).toBe(0);
    const right = computePhotoPlacement(2000, 1000, SQUARE, {
      zoom: 1,
      offsetX: 1,
      offsetY: 0,
    });
    expect(right.x + right.w).toBe(1000);
  });

  it("grows the image beyond the frame when zoomed in", () => {
    expect(
      computePhotoPlacement(2000, 1000, SQUARE, {
        zoom: 2,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toEqual({ x: -1500, y: -500, w: 4000, h: 2000 });
  });

  it("keeps the frame covered for extreme values", () => {
    const frame = { x: 0, y: 0, w: 1080, h: 640 };
    const placement = computePhotoPlacement(1200, 900, frame, {
      zoom: 99,
      offsetX: 5,
      offsetY: -5,
    });
    expect(coversFrame(placement, frame)).toBe(true);
  });

  it("shrinks the image inside the frame below zoom 1, centered", () => {
    // Square image in a square frame at half size: 500×500, centered.
    const placement = computePhotoPlacement(1000, 1000, SQUARE, {
      zoom: 0.5,
      offsetX: 0,
      offsetY: 0,
    });
    expect(placement).toEqual({ x: 250, y: 250, w: 500, h: 500 });
    expect(coversFrame(placement, SQUARE)).toBe(false);
  });

  it("slides a shrunk image to the frame edges, never out of the frame", () => {
    const topLeft = computePhotoPlacement(1000, 1000, SQUARE, {
      zoom: 0.5,
      offsetX: -1,
      offsetY: -1,
    });
    expect(topLeft).toEqual({ x: 0, y: 0, w: 500, h: 500 });
    const bottomRight = computePhotoPlacement(1000, 1000, SQUARE, {
      zoom: 0.5,
      offsetX: 9,
      offsetY: 9,
    });
    expect(bottomRight).toEqual({ x: 500, y: 500, w: 500, h: 500 });
  });
});

describe("clampCrop", () => {
  it("clamps zoom and offsets to legal bounds", () => {
    expect(clampCrop({ zoom: 0.01, offsetX: -7, offsetY: 7 })).toEqual({
      zoom: MIN_ZOOM,
      offsetX: -1,
      offsetY: 1,
    });
    expect(clampCrop({ zoom: 99, offsetX: 0, offsetY: 0 }).zoom).toBe(MAX_ZOOM);
  });

  it("allows zooming below the cover fit", () => {
    expect(clampCrop({ zoom: 0.6, offsetX: 0, offsetY: 0 }).zoom).toBe(0.6);
  });
});

describe("coversFrame", () => {
  it("accepts an exact fit", () => {
    expect(coversFrame(SQUARE, SQUARE)).toBe(true);
  });

  it("rejects a placement with a gap on one side", () => {
    expect(coversFrame({ x: 10, y: 0, w: 1000, h: 1000 }, SQUARE)).toBe(false);
  });
});

describe("clampAdjustment", () => {
  const guardrails = {
    maxOffsetX: 40,
    maxOffsetY: 20,
    minScale: 0.8,
    maxScale: 1.25,
  };

  it("clamps offsets and scale to the guardrails", () => {
    expect(
      clampAdjustment({ dx: 100, dy: -100, scale: 3 }, guardrails),
    ).toEqual({ dx: 40, dy: -20, scale: 1.25 });
  });

  it("LOCKED forbids any movement", () => {
    expect(clampAdjustment({ dx: 5, dy: 5, scale: 1.1 }, LOCKED)).toEqual({
      dx: 0,
      dy: 0,
      scale: 1,
    });
  });
});

describe("applyAdjustment", () => {
  it("scales about the frame center, then translates", () => {
    const frame = { x: 100, y: 100, w: 200, h: 100 };
    expect(applyAdjustment(frame, { dx: 10, dy: -5, scale: 1.2 })).toEqual({
      x: 100 - 20 + 10,
      y: 100 - 10 - 5,
      w: 240,
      h: 120,
    });
  });

  it("is the identity for the neutral adjustment", () => {
    const frame = { x: 3, y: 4, w: 5, h: 6 };
    expect(applyAdjustment(frame, { dx: 0, dy: 0, scale: 1 })).toEqual(frame);
  });
});

describe("containFit", () => {
  it("letterboxes wide content centered in a square frame", () => {
    expect(containFit(400, 200, { x: 0, y: 0, w: 100, h: 100 })).toEqual({
      x: 0,
      y: 25,
      w: 100,
      h: 50,
    });
  });

  it("pillarboxes tall content centered in a square frame", () => {
    expect(containFit(200, 400, { x: 50, y: 0, w: 100, h: 100 })).toEqual({
      x: 75,
      y: 0,
      w: 50,
      h: 100,
    });
  });
});
