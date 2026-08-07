import { describe, expect, it } from "vitest";
import {
  applyAdjustment,
  clampAdjustment,
  clampCrop,
  computeCoverCrop,
  containFit,
  MAX_ZOOM,
} from "./geometry";
import { DEFAULT_CROP, LOCKED } from "./types";

describe("computeCoverCrop", () => {
  it("shows the full image when aspect ratios match at zoom 1", () => {
    expect(computeCoverCrop(1000, 1000, 500, 500, DEFAULT_CROP)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1000,
      sh: 1000,
    });
  });

  it("center-crops a landscape image into a square frame", () => {
    // coverScale = max(1000/2000, 1000/1000) = 1 → visible 1000×1000, centered
    expect(computeCoverCrop(2000, 1000, 1000, 1000, DEFAULT_CROP)).toEqual({
      sx: 500,
      sy: 0,
      sw: 1000,
      sh: 1000,
    });
  });

  it("pans to the edges at offset -1 and +1, never beyond", () => {
    const left = computeCoverCrop(2000, 1000, 1000, 1000, {
      zoom: 1,
      offsetX: -1,
      offsetY: 0,
    });
    expect(left.sx).toBe(0);
    const right = computeCoverCrop(2000, 1000, 1000, 1000, {
      zoom: 1,
      offsetX: 1,
      offsetY: 0,
    });
    expect(right.sx).toBe(1000);
    expect(right.sx + right.sw).toBe(2000);
  });

  it("shows less of the image when zoomed in", () => {
    const zoomed = computeCoverCrop(2000, 1000, 1000, 1000, {
      zoom: 2,
      offsetX: 0,
      offsetY: 0,
    });
    expect(zoomed).toEqual({ sx: 750, sy: 250, sw: 500, sh: 500 });
  });

  it("keeps the visible rect inside the image for extreme values", () => {
    const rect = computeCoverCrop(1200, 900, 1080, 640, {
      zoom: 99,
      offsetX: 5,
      offsetY: -5,
    });
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1200);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(900);
  });
});

describe("clampCrop", () => {
  it("clamps zoom and offsets to legal bounds", () => {
    expect(clampCrop({ zoom: 0.2, offsetX: -7, offsetY: 7 })).toEqual({
      zoom: 1,
      offsetX: -1,
      offsetY: 1,
    });
    expect(clampCrop({ zoom: 99, offsetX: 0, offsetY: 0 }).zoom).toBe(MAX_ZOOM);
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
