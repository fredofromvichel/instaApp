/**
 * Canvas renderer: draws a filled-in template at exact target resolution.
 *
 * Preview and export share this single code path — previews render at full
 * 1080-based resolution and are scaled down via CSS, which is what guarantees
 * "preview looks exactly like the exported PNG" (SPEC.md §7).
 */
import { getFormat } from "../lib/formats";
import {
  applyAdjustment,
  clampAdjustment,
  computeCoverCrop,
  containFit,
} from "./geometry";
import { autoFitText } from "./text";
import type {
  Fill,
  Frame,
  Palette,
  PhotoSlot,
  QrSlot,
  RenderInput,
  Slot,
  TextSlot,
} from "./types";
import { IDENTITY_ADJUSTMENT, LOCKED } from "./types";

export function resolvePalette(input: RenderInput): Palette {
  if (input.palette) return input.palette;
  const { template, paletteId } = input;
  const palette =
    template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0];
  if (!palette) {
    throw new Error(`Vorlage ${template.id} hat keine Farbpalette`);
  }
  return palette;
}

/**
 * Ensure all fonts used by the template are loaded before rendering, so
 * canvas text never falls back to a substitute font. No-op where the
 * CSS Font Loading API is unavailable (e.g. tests).
 */
export async function ensureFontsLoaded(
  template: RenderInput["template"],
): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const specs = new Set<string>();
  for (const slot of template.slots) {
    if (slot.type === "text") {
      specs.add(`${slot.font.weight} 16px ${slot.font.family}`);
    }
  }
  try {
    await Promise.all([...specs].map((spec) => document.fonts.load(spec)));
  } catch {
    // Never block rendering on font loading problems.
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return `rgba(0,0,0,${alpha})`;
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: Fill,
  palette: Palette,
  frame: Frame,
): string | CanvasGradient {
  if (fill.type === "solid") return palette.colors[fill.role];
  if (fill.type === "scrim") {
    const color = palette.colors[fill.role];
    const gradient = ctx.createLinearGradient(
      frame.x,
      fill.direction === "down" ? frame.y : frame.y + frame.h,
      frame.x,
      fill.direction === "down" ? frame.y + frame.h : frame.y,
    );
    gradient.addColorStop(0, hexToRgba(color, 0));
    gradient.addColorStop(0.35, hexToRgba(color, fill.opacity * 0.45));
    gradient.addColorStop(1, hexToRgba(color, fill.opacity));
    return gradient;
  }
  // CSS convention: 0deg = to top, 90deg = to right.
  const angle = (fill.angle * Math.PI) / 180;
  const dirX = Math.sin(angle);
  const dirY = -Math.cos(angle);
  const half = (Math.abs(dirX) * frame.w + Math.abs(dirY) * frame.h) / 2;
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const gradient = ctx.createLinearGradient(
    cx - dirX * half,
    cy - dirY * half,
    cx + dirX * half,
    cy + dirY * half,
  );
  gradient.addColorStop(0, palette.colors[fill.from]);
  gradient.addColorStop(1, palette.colors[fill.to]);
  return gradient;
}

function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  radius: number,
) {
  ctx.beginPath();
  if (radius > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(frame.x, frame.y, frame.w, frame.h, radius);
  } else {
    ctx.rect(frame.x, frame.y, frame.w, frame.h);
  }
}

function setFont(ctx: CanvasRenderingContext2D, slot: TextSlot, size: number) {
  ctx.font = `${slot.font.weight} ${size}px ${slot.font.family}`;
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${slot.font.letterSpacing ?? 0}px`;
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  slot: TextSlot,
  frame: Frame,
  palette: Palette,
  text: string,
) {
  const content = slot.font.uppercase ? text.toUpperCase() : text;
  const { fontSize, lines } = autoFitText(content, {
    maxWidth: frame.w,
    maxHeight: frame.h,
    maxLines: slot.maxLines,
    minSize: slot.font.minSize,
    maxSize: slot.font.maxSize,
    lineHeight: slot.font.lineHeight,
    measure: (t, size) => {
      setFont(ctx, slot, size);
      return ctx.measureText(t).width;
    },
  });
  if (lines.length === 0) return;

  setFont(ctx, slot, fontSize);
  const lineHeightPx = fontSize * slot.font.lineHeight;
  const blockHeight = lines.length * lineHeightPx;
  const align = slot.align ?? "left";
  const vAlign = slot.vAlign ?? "top";

  const blockTop =
    vAlign === "top"
      ? frame.y
      : vAlign === "center"
        ? frame.y + (frame.h - blockHeight) / 2
        : frame.y + frame.h - blockHeight;
  const anchorX =
    align === "left"
      ? frame.x
      : align === "center"
        ? frame.x + frame.w / 2
        : frame.x + frame.w;

  if (slot.badge) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const badgeW = widest + 2 * slot.badge.paddingX;
    const badgeH = blockHeight + 2 * slot.badge.paddingY;
    const badgeX =
      align === "left"
        ? anchorX - slot.badge.paddingX
        : align === "center"
          ? anchorX - badgeW / 2
          : anchorX - badgeW + slot.badge.paddingX;
    const badgeFrame: Frame = {
      x: badgeX,
      y: blockTop - slot.badge.paddingY,
      w: badgeW,
      h: badgeH,
    };
    ctx.fillStyle = resolveFill(ctx, slot.badge.fill, palette, badgeFrame);
    pathRoundRect(ctx, badgeFrame, slot.badge.cornerRadius);
    ctx.fill();
  }

  ctx.fillStyle = palette.colors[slot.color];
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.fillText(line, anchorX, blockTop + (i + 0.5) * lineHeightPx);
  });
}

function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  palette: Palette,
  radius: number,
) {
  pathRoundRect(ctx, frame, radius);
  ctx.fillStyle = palette.colors.muted;
  ctx.fill();
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  slot: PhotoSlot,
  frame: Frame,
  input: RenderInput,
  palette: Palette,
) {
  const value = input.values[slot.id];
  if (value?.type !== "photo") {
    if (!slot.optional) {
      drawPhotoPlaceholder(ctx, frame, palette, slot.cornerRadius ?? 0);
    }
    return;
  }
  const { sx, sy, sw, sh } = computeCoverCrop(
    value.width,
    value.height,
    frame.w,
    frame.h,
    value.crop,
  );
  ctx.save();
  pathRoundRect(ctx, frame, slot.cornerRadius ?? 0);
  ctx.clip();
  ctx.drawImage(
    value.source,
    sx,
    sy,
    sw,
    sh,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
  );
  ctx.restore();
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  slot: QrSlot | (Slot & { type: "logo" }),
  frame: Frame,
  input: RenderInput,
) {
  const value = input.values[slot.id];
  if (value?.type !== "image") return;
  const target = containFit(value.width, value.height, frame);
  ctx.save();
  if (slot.type === "qr" && (slot.cornerRadius ?? 0) > 0) {
    pathRoundRect(ctx, target, slot.cornerRadius ?? 0);
    ctx.clip();
  }
  ctx.drawImage(value.source, target.x, target.y, target.w, target.h);
  ctx.restore();
}

/** Slot frame for the given format with the user's clamped adjustment applied. */
export function effectiveFrame(
  slot: Slot,
  formatId: RenderInput["formatId"],
  adjustments: RenderInput["adjustments"],
): Frame {
  const adjustment = clampAdjustment(
    adjustments?.[slot.id] ?? IDENTITY_ADJUSTMENT,
    slot.guardrails ?? LOCKED,
  );
  return applyAdjustment(slot.frames[formatId], adjustment);
}

/**
 * Render a filled-in template onto `canvas` at the exact resolution of the
 * chosen format. Draw order = slot order (background first).
 */
export async function renderPost(
  canvas: HTMLCanvasElement,
  input: RenderInput,
): Promise<void> {
  const format = getFormat(input.formatId);
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D-Kontext nicht verfügbar");
  const palette = resolvePalette(input);
  await ensureFontsLoaded(input.template);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const slot of input.template.slots) {
    const frame = effectiveFrame(slot, input.formatId, input.adjustments);
    switch (slot.type) {
      case "background": {
        const full: Frame = { x: 0, y: 0, w: format.width, h: format.height };
        ctx.fillStyle = resolveFill(ctx, slot.fill, palette, full);
        ctx.fillRect(0, 0, format.width, format.height);
        break;
      }
      case "shape": {
        ctx.fillStyle = resolveFill(ctx, slot.fill, palette, frame);
        if (slot.shape === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(
            frame.x + frame.w / 2,
            frame.y + frame.h / 2,
            frame.w / 2,
            frame.h / 2,
            0,
            0,
            Math.PI * 2,
          );
        } else {
          pathRoundRect(ctx, frame, slot.cornerRadius ?? 0);
        }
        ctx.fill();
        break;
      }
      case "photo":
        drawPhoto(ctx, slot, frame, input, palette);
        break;
      case "text": {
        if (
          slot.showWith &&
          input.values[slot.showWith] === undefined &&
          !input.previewExamples
        ) {
          break;
        }
        const value = input.values[slot.id];
        const text = slot.fixed
          ? slot.example
          : value?.type === "text"
            ? value.text
            : slot.optional && !input.previewExamples
              ? ""
              : slot.example;
        if (text.trim() !== "") drawText(ctx, slot, frame, palette, text);
        break;
      }
      case "qr":
      case "logo":
        drawContainedImage(ctx, slot, frame, input);
        break;
    }
  }
}
