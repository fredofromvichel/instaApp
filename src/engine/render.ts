/**
 * Canvas renderer: draws a filled-in template at exact target resolution.
 *
 * Preview and export share this single code path — previews render at full
 * 1080-based resolution and are scaled down via CSS, which is what guarantees
 * "preview looks exactly like the exported PNG" (SPEC.md §7).
 */
import { getFormat } from "../lib/formats";
import { FONT_OPTIONS, fontFamilyOf, fontSizeFactor } from "./fonts";
import {
  applyAdjustment,
  clampAdjustment,
  computePhotoPlacement,
  containFit,
  coversFrame,
} from "./geometry";
import {
  autoFitStyled,
  type RunStyle,
  type StyledMeasureFn,
  spansToRuns,
} from "./text";
import type {
  ColorRole,
  Fill,
  Frame,
  Palette,
  PhotoSlot,
  PhotoValue,
  QrSlot,
  RenderInput,
  Slot,
  SlotAdjustment,
  SlotValue,
  SlotVariantOverride,
  TextSlot,
  TextSpan,
} from "./types";
import {
  activeVariant,
  DEFAULT_CROP,
  IDENTITY_ADJUSTMENT,
  LOCKED,
  templateSlides,
} from "./types";

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
      specs.add(`italic 900 16px ${slot.font.family}`);
    }
  }
  // The user may switch any field to any of the offered families.
  for (const option of FONT_OPTIONS) {
    if (option.family) {
      specs.add(`400 16px ${option.family}`);
      specs.add(`900 16px ${option.family}`);
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

/** The user's per-field formatting, defaulted to the template's styling. */
interface TextStyle {
  bold: boolean;
  italic: boolean;
  family: string | null;
  /** Auto-fit range factor, so a switched family keeps its optical size. */
  sizeFactor: number;
  /** Range formatting (RTF-lite) on top of the field styling. */
  spans?: TextSpan[];
}

const FIELD_PLAIN: TextStyle = {
  bold: false,
  italic: false,
  family: null,
  sizeFactor: 1,
};

/**
 * Resolve a run color: palette-role names follow the active palette, concrete
 * hex values are the user's explicit pick and stay as chosen.
 */
function resolveRunColor(
  color: string | undefined,
  palette: Palette,
  fallback: string,
): string {
  if (!color) return fallback;
  if (color.startsWith("#")) return color;
  const roleColor = palette.colors[color as ColorRole];
  return roleColor ?? fallback;
}

/**
 * Is a slot actually filled in? Text values can carry formatting without any
 * text, which does not count as content (companion captions must not appear
 * for a field the user only styled).
 */
function hasContent(values: RenderInput["values"], slotId: string): boolean {
  const value = values[slotId];
  if (!value) return false;
  return value.type !== "text" || value.text.trim() !== "";
}

function textStyleOf(value: SlotValue | undefined): TextStyle {
  if (value?.type !== "text") return FIELD_PLAIN;
  return {
    bold: value.bold === true,
    italic: value.italic === true,
    family: fontFamilyOf(value.font),
    sizeFactor: fontSizeFactor(value.font),
    spans: value.spans,
  };
}

function setFont(
  ctx: CanvasRenderingContext2D,
  slot: TextSlot,
  size: number,
  field: TextStyle,
  run: RunStyle,
) {
  // Bold always lands visibly above the template's own weight.
  const weight = run.bold
    ? Math.min(900, Math.max(700, slot.font.weight + 200))
    : slot.font.weight;
  const family = field.family ?? slot.font.family;
  ctx.font = `${run.italic ? "italic " : ""}${weight} ${Math.max(1, size * run.size)}px ${family}`;
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
  /**
   * The user's size adjustment: scales the auto-fit range along with the
   * frame, so "Größer" genuinely enlarges text instead of stopping at the
   * template's maxSize.
   */
  fontScale = 1,
  style: TextStyle = FIELD_PLAIN,
) {
  // Runs are computed on the raw text (span indices refer to it); uppercase
  // transforms per run afterwards, so "ß" → "SS" cannot shift the spans.
  let runs = spansToRuns(text, style.spans, style);
  if (slot.font.uppercase) {
    runs = runs.map((run) => ({ ...run, text: run.text.toUpperCase() }));
  }
  const sizeScale = fontScale * style.sizeFactor;
  const measure: StyledMeasureFn = (t, size, run) => {
    setFont(ctx, slot, size, style, run);
    return ctx.measureText(t).width;
  };
  const { fontSize, lines } = autoFitStyled(runs, {
    maxWidth: frame.w,
    maxHeight: frame.h,
    maxLines: slot.maxLines,
    minSize: slot.font.minSize * sizeScale,
    maxSize: slot.font.maxSize * sizeScale,
    lineHeight: slot.font.lineHeight,
    measure,
  });
  if (lines.length === 0) return;

  const lineHeights = lines.map(
    (line) => fontSize * slot.font.lineHeight * line.maxSize,
  );
  const blockHeight = lineHeights.reduce((a, b) => a + b, 0);
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
    const paddingX = slot.badge.paddingX * fontScale;
    const paddingY = slot.badge.paddingY * fontScale;
    const widest = Math.max(...lines.map((line) => line.width));
    const badgeW = widest + 2 * paddingX;
    const badgeH = blockHeight + 2 * paddingY;
    const badgeX =
      align === "left"
        ? anchorX - paddingX
        : align === "center"
          ? anchorX - badgeW / 2
          : anchorX - badgeW + paddingX;
    const badgeFrame: Frame = {
      x: badgeX,
      y: blockTop - paddingY,
      w: badgeW,
      h: badgeH,
    };
    ctx.save();
    ctx.globalAlpha = slot.badge.opacity ?? 1;
    ctx.fillStyle = resolveFill(ctx, slot.badge.fill, palette, badgeFrame);
    pathRoundRect(ctx, badgeFrame, slot.badge.cornerRadius);
    ctx.fill();
    ctx.restore();
  }

  const defaultColor = palette.colors[slot.color];
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let y = blockTop;
  lines.forEach((line, i) => {
    const lineHeight = lineHeights[i] ?? 0;
    let x =
      align === "left"
        ? anchorX
        : align === "center"
          ? anchorX - line.width / 2
          : anchorX - line.width;
    for (const part of line.parts) {
      setFont(ctx, slot, fontSize, style, part.style);
      ctx.fillStyle = resolveRunColor(part.style.color, palette, defaultColor);
      ctx.fillText(part.text, x, y + lineHeight / 2);
      x += measure(part.text, fontSize, part.style);
    }
    y += lineHeight;
  });
}

function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  palette: Palette,
  radius: number,
) {
  // A muted→accent sweep instead of flat gray: the placeholder follows the
  // palette, so switching palettes is visible even before a photo is picked.
  const gradient = ctx.createLinearGradient(
    frame.x,
    frame.y,
    frame.x + frame.w,
    frame.y + frame.h,
  );
  gradient.addColorStop(0, palette.colors.muted);
  gradient.addColorStop(1, hexToRgba(palette.colors.accent, 0.55));
  pathRoundRect(ctx, frame, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
}

/** Longest edge of the cached mini-canvas the blurred backdrop grows out of. */
const BACKDROP_SOURCE_SIZE = 64;

/** Extra canvas blur, as a fraction of the frame's longer edge. */
const BACKDROP_BLUR = 0.045;

/**
 * One tiny copy per photo, reused across renders — the backdrop is redrawn on
 * every pan/zoom frame, and downscaling a full-size photo each time would make
 * dragging stutter on a phone.
 */
const backdropCache = new WeakMap<CanvasImageSource, HTMLCanvasElement>();

function backdropSource(value: PhotoValue): HTMLCanvasElement | null {
  const cached = backdropCache.get(value.source);
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const scale = Math.min(
    1,
    BACKDROP_SOURCE_SIZE / Math.max(value.width, value.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(value.width * scale));
  canvas.height = Math.max(1, Math.round(value.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(value.source, 0, 0, canvas.width, canvas.height);
  backdropCache.set(value.source, canvas);
  return canvas;
}

/**
 * Fill the slot with a blurred, cover-scaled copy of the photo — the trick
 * video players use for videos that don't fit their box. Only runs when the
 * user shrank the photo below its slot, so the gap shows the photo's own
 * colors instead of raw whitespace. The caller has clipped to `frame`.
 */
function drawBlurredBackdrop(
  ctx: CanvasRenderingContext2D,
  value: PhotoValue,
  frame: Frame,
) {
  const thumbnail = backdropSource(value);
  const source = thumbnail ?? value.source;
  const width = thumbnail?.width ?? value.width;
  const height = thumbnail?.height ?? value.height;
  const radius = Math.max(frame.w, frame.h) * BACKDROP_BLUR;
  // Blur fades out what we draw, so cover an inflated frame and let the
  // caller's clip cut the soft border away.
  const bleed = radius * 3;
  const inflated: Frame = {
    x: frame.x - bleed,
    y: frame.y - bleed,
    w: frame.w + 2 * bleed,
    h: frame.h + 2 * bleed,
  };
  const target = computePhotoPlacement(width, height, inflated, DEFAULT_CROP);
  ctx.save();
  // Upscaling the mini-canvas already blurs; the filter (where supported)
  // smooths the interpolation seams away.
  if ("filter" in ctx) ctx.filter = `blur(${radius}px)`;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, target.x, target.y, target.w, target.h);
  ctx.restore();
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  slot: PhotoSlot,
  frame: Frame,
  input: RenderInput,
  palette: Palette,
  cornerRadius: number,
) {
  const value = input.values[slot.id];
  if (value?.type !== "photo") {
    if (!slot.optional) {
      drawPhotoPlaceholder(ctx, frame, palette, cornerRadius);
    }
    return;
  }
  const placement = computePhotoPlacement(
    value.width,
    value.height,
    frame,
    value.crop,
  );
  ctx.save();
  pathRoundRect(ctx, frame, cornerRadius);
  ctx.clip();
  if (!coversFrame(placement, frame)) {
    drawBlurredBackdrop(ctx, value, frame);
  }
  ctx.drawImage(
    value.source,
    placement.x,
    placement.y,
    placement.w,
    placement.h,
  );
  ctx.restore();
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  slot: QrSlot | (Slot & { type: "logo" }),
  frame: Frame,
  input: RenderInput,
  cornerRadius: number,
) {
  const value = input.values[slot.id];
  if (value?.type !== "image") return;
  const target = containFit(value.width, value.height, frame);
  ctx.save();
  if (slot.type === "qr" && cornerRadius > 0) {
    pathRoundRect(ctx, target, cornerRadius);
    ctx.clip();
  }
  ctx.drawImage(value.source, target.x, target.y, target.w, target.h);
  ctx.restore();
}

/**
 * The canvas an adjustment is clamped against: the full slot space, which for
 * a carousel template is `slides` images wide.
 */
export function canvasBounds(
  template: RenderInput["template"],
  formatId: RenderInput["formatId"],
): Frame {
  const format = getFormat(formatId);
  return {
    x: 0,
    y: 0,
    w: format.width * templateSlides(template),
    h: format.height,
  };
}

/** A slot's clamped adjustment for the given format. */
export function effectiveAdjustment(
  slot: Slot,
  template: RenderInput["template"],
  formatId: RenderInput["formatId"],
  adjustments: RenderInput["adjustments"],
): SlotAdjustment {
  return clampAdjustment(
    adjustments?.[slot.id] ?? IDENTITY_ADJUSTMENT,
    slot.guardrails ?? LOCKED,
    slot.frames[formatId],
    canvasBounds(template, formatId),
  );
}

/** Slot frame for the given format with the user's clamped adjustment applied. */
export function effectiveFrame(
  slot: Slot,
  template: RenderInput["template"],
  formatId: RenderInput["formatId"],
  adjustments: RenderInput["adjustments"],
): Frame {
  return applyAdjustment(
    slot.frames[formatId],
    effectiveAdjustment(slot, template, formatId, adjustments),
  );
}

/**
 * Render a filled-in template onto `canvas` at the exact resolution of the
 * chosen format. Draw order = slot order (background first).
 *
 * Carousel templates (`template.slides` > 1) lay their slots out in a
 * `slides × width` wide coordinate space; `input.slide` picks the window
 * that lands on the canvas, so photos/gradients continue seamlessly from
 * one exported image into the next.
 */
export async function renderPost(
  canvas: HTMLCanvasElement,
  input: RenderInput,
): Promise<void> {
  const format = getFormat(input.formatId);
  const slides = templateSlides(input.template);
  const slide = Math.max(0, Math.min(slides - 1, input.slide ?? 0));
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D-Kontext nicht verfügbar");
  const palette = resolvePalette(input);
  await ensureFontsLoaded(input.template);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Setting canvas.width above reset the transform, so this never stacks.
  ctx.translate(-slide * format.width, 0);

  const variant = activeVariant(input.template, input.variantId);

  for (const slot of input.template.slots) {
    const override: SlotVariantOverride | undefined =
      variant?.overrides[slot.id];
    if (override?.hidden) continue;
    const frame = effectiveFrame(
      slot,
      input.template,
      input.formatId,
      input.adjustments,
    );
    switch (slot.type) {
      case "background": {
        const full: Frame = {
          x: 0,
          y: 0,
          w: format.width * slides,
          h: format.height,
        };
        const fill = override?.fill ?? slot.fill;
        ctx.fillStyle = resolveFill(ctx, fill, palette, full);
        ctx.fillRect(full.x, full.y, full.w, full.h);
        break;
      }
      case "shape": {
        const fill = override?.fill ?? slot.fill;
        ctx.fillStyle = resolveFill(ctx, fill, palette, frame);
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
          pathRoundRect(
            ctx,
            frame,
            override?.cornerRadius ?? slot.cornerRadius ?? 0,
          );
        }
        ctx.fill();
        break;
      }
      case "photo":
        drawPhoto(
          ctx,
          slot,
          frame,
          input,
          palette,
          override?.cornerRadius ?? slot.cornerRadius ?? 0,
        );
        break;
      case "text": {
        if (
          slot.showWith &&
          !hasContent(input.values, slot.showWith) &&
          !input.previewExamples
        ) {
          break;
        }
        const value = input.values[slot.id];
        // A value may exist while its text is empty — the user picked
        // formatting for a field she has not typed into (yet). That must
        // behave exactly like "not filled in", not like an empty design.
        const typed = value?.type === "text" ? value.text : "";
        const text = slot.fixed
          ? slot.example
          : typed.trim() !== ""
            ? typed
            : slot.optional && !input.previewExamples
              ? ""
              : slot.example;
        if (text.trim() !== "") {
          const adjustment = effectiveAdjustment(
            slot,
            input.template,
            input.formatId,
            input.adjustments,
          );
          drawText(
            ctx,
            slot,
            frame,
            palette,
            text,
            adjustment.scale,
            textStyleOf(value),
          );
        }
        break;
      }
      case "qr":
      case "logo":
        drawContainedImage(
          ctx,
          slot,
          frame,
          input,
          override?.cornerRadius ??
            (slot.type === "qr" ? (slot.cornerRadius ?? 0) : 0),
        );
        break;
    }
  }
}
