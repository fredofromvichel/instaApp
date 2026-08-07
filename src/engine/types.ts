/**
 * Template schema (SPEC.md §4/§5).
 *
 * Three separate concerns feed the renderer:
 *  - Template:   declarative design (slots, geometry, palettes) — static data
 *  - SlotValue:  the user's content (photo, texts, QR image, logo)
 *  - SlotAdjustment: the user's light repositioning, clamped by guardrails
 *
 * All geometry lives in a 1080-based pixel space: coordinates are actual
 * canvas pixels of the target format (width always 1080; height 1080/1350/1920).
 * Every slot declares an explicit frame per format — explicit geometry is what
 * guarantees professional layouts in all three formats.
 */
import type { PostFormat } from "../lib/formats";

export type FormatId = PostFormat["id"];

/* ---------------------------------------------------------------- palettes */

/**
 * Slots never reference concrete colors, only semantic roles. Switching the
 * palette therefore re-colors the whole design consistently (SPEC.md §4).
 */
export type ColorRole =
  | "background"
  | "surface"
  | "accent"
  | "text"
  | "textOnAccent"
  | "muted";

export interface Palette {
  id: string;
  /** German display name, e.g. "Terrakotta". */
  name: string;
  colors: Record<ColorRole, string>;
}

export type Fill =
  | { type: "solid"; role: ColorRole }
  | {
      type: "linear-gradient";
      from: ColorRole;
      to: ColorRole;
      /** CSS convention: 0 = to top, 90 = to right. */
      angle: number;
    };

/* ---------------------------------------------------------------- geometry */

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Limits for the user's light repositioning of a slot (SPEC.md §4).
 * Offsets are in canvas pixels from the template default; scale is relative.
 */
export interface Guardrails {
  maxOffsetX: number;
  maxOffsetY: number;
  minScale: number;
  maxScale: number;
}

/** Immovable slot — the default when a slot declares no guardrails. */
export const LOCKED: Guardrails = {
  maxOffsetX: 0,
  maxOffsetY: 0,
  minScale: 1,
  maxScale: 1,
};

/** The user's repositioning of one slot. Always clamped via guardrails. */
export interface SlotAdjustment {
  dx: number;
  dy: number;
  scale: number;
}

export const IDENTITY_ADJUSTMENT: SlotAdjustment = { dx: 0, dy: 0, scale: 1 };

/* ------------------------------------------------------------------- slots */

interface SlotBase {
  id: string;
  frames: Record<FormatId, Frame>;
  /** Omitted = LOCKED (no repositioning allowed). */
  guardrails?: Guardrails;
  /** Optional slots are simply skipped when no value is provided. */
  optional?: boolean;
}

export interface BackgroundSlot extends SlotBase {
  type: "background";
  fill: Fill;
}

export interface ShapeSlot extends SlotBase {
  type: "shape";
  shape: "rect" | "ellipse";
  fill: Fill;
  cornerRadius?: number;
}

export interface PhotoSlot extends SlotBase {
  type: "photo";
  cornerRadius?: number;
}

export interface FontSpec {
  /** CSS font-family; self-hosted fonts arrive with the template tasks. */
  family: string;
  weight: number;
  /** Auto-fit range: the renderer shrinks from maxSize toward minSize. */
  minSize: number;
  maxSize: number;
  /** Factor, e.g. 1.2. */
  lineHeight: number;
  letterSpacing?: number;
  uppercase?: boolean;
}

export interface TextSlot extends SlotBase {
  type: "text";
  /** Semantic role, e.g. "headline" | "price" — used by the form UI (task 06). */
  role: string;
  /** German input label, e.g. "Überschrift". */
  label: string;
  font: FontSpec;
  color: ColorRole;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "center" | "bottom";
  maxLines: number;
  /** Soft input limit for the form UI; the renderer never overflows anyway. */
  maxChars?: number;
  multiline?: boolean;
  /** Chip/badge drawn snugly behind the text block (e.g. price tags). */
  badge?: {
    fill: Fill;
    paddingX: number;
    paddingY: number;
    cornerRadius: number;
  };
  /** German example content so previews look finished (SPEC.md §5). */
  example: string;
}

/** The engine only places a QR image; generation/styling is task 07. */
export interface QrSlot extends SlotBase {
  type: "qr";
  cornerRadius?: number;
}

export interface LogoSlot extends SlotBase {
  type: "logo";
}

export type Slot =
  | BackgroundSlot
  | ShapeSlot
  | PhotoSlot
  | TextSlot
  | QrSlot
  | LogoSlot;

/* ---------------------------------------------------------------- template */

export type TemplateCategory = "products" | "quotes" | "dogs";

export interface Template {
  id: string;
  /** German display name. */
  name: string;
  category: TemplateCategory;
  /** First palette is the default. */
  palettes: Palette[];
  /** Draw order = array order (background first). */
  slots: Slot[];
}

/* ------------------------------------------------------------------ values */

/** Pan/zoom crop of the photo inside its slot (driven by task 05 gestures). */
export interface CropState {
  /** 1 = exact cover fit; clamped to [1, MAX_ZOOM]. */
  zoom: number;
  /** -1..1 — fraction of the available pan range (0 = centered). */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0 };

export interface PhotoValue {
  type: "photo";
  source: CanvasImageSource;
  /** Intrinsic pixel size of `source`. */
  width: number;
  height: number;
  crop: CropState;
}

/** Pre-rendered image content for qr and logo slots (contain-fitted). */
export interface ImageValue {
  type: "image";
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface TextValue {
  type: "text";
  text: string;
}

export type SlotValue = PhotoValue | ImageValue | TextValue;

/* ----------------------------------------------------------------- render */

export interface RenderInput {
  template: Template;
  formatId: FormatId;
  /** Defaults to the template's first palette. */
  paletteId?: string;
  /**
   * Explicit palette override (e.g. a brand-kit palette that is not part of
   * the template). Takes precedence over paletteId.
   */
  palette?: Palette;
  /** Keyed by slot id. Missing required text slots fall back to `example`. */
  values: Record<string, SlotValue>;
  /** Keyed by slot id; clamped against each slot's guardrails. */
  adjustments?: Record<string, SlotAdjustment>;
}
