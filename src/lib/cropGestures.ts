/**
 * Pure gesture → crop math (task 05). Drag pans, pinch zooms — expressed as
 * transformations of the engine's CropState so gestures, preview, and export
 * can never disagree. Results are always clamped: the photo can never leave
 * its slot uncovered.
 */
import { clampCrop, computeCoverCrop } from "../engine/geometry";
import type { CropState } from "../engine/types";

/**
 * Pan the crop by a drag of (dx, dy) in canvas pixels over the photo slot
 * frame. Dragging right moves the photo right (shows more of its left side).
 * Axes without leftover image (image edge-to-edge) simply don't pan.
 */
export function panCrop(
  crop: CropState,
  dxCanvas: number,
  dyCanvas: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): CropState {
  const clamped = clampCrop(crop);
  const { sw, sh } = computeCoverCrop(
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    clamped,
  );
  // Canvas pixels per source pixel.
  const scale = frameWidth / sw;
  const leftoverX = (imageWidth - sw) / 2;
  const leftoverY = (imageHeight - sh) / 2;
  return clampCrop({
    zoom: clamped.zoom,
    offsetX:
      leftoverX > 0
        ? clamped.offsetX - dxCanvas / scale / leftoverX
        : clamped.offsetX,
    offsetY:
      leftoverY > 0
        ? clamped.offsetY - dyCanvas / scale / leftoverY
        : clamped.offsetY,
  });
}

/** Pinch: multiply zoom by the ratio of current to initial finger distance. */
export function pinchCrop(crop: CropState, ratio: number): CropState {
  if (!Number.isFinite(ratio) || ratio <= 0) return clampCrop(crop);
  return clampCrop({ ...crop, zoom: crop.zoom * ratio });
}
