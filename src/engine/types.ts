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
/**
 * Semantic color roles. Templates never hold concrete colors — they reference
 * these, and the palette fills them in.
 *
 * The contract every template must honor, so that switching a palette changes
 * *every* template comparably (SPEC.md §4). Getting this wrong is invisible in
 * one template and glaring when the user compares two:
 *
 * - `background` — the page background. **The largest area of every design
 *   must use this role**, otherwise a palette appears to do nothing there.
 * - `surface` — cards, panels and mats lying on the background.
 * - `accent` — chips, badges, rules: the small, strong highlights.
 * - `text` — main text on background/surface. Also the ink of photo scrims:
 *   text drawn on a scrim uses `background`, so the two always pair up and
 *   invert together for dark palettes.
 * - `muted` — secondary text on background/surface.
 * - `textOnAccent` — text on an accent-colored area.
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
    }
  | {
      /** Transparent → color gradient, e.g. to keep text readable on photos. */
      type: "scrim";
      role: ColorRole;
      /** "down": transparent at top, solid at bottom. "up": the reverse. */
      direction: "up" | "down";
      /** Peak opacity at the solid end (0..1). */
      opacity: number;
    };

/* ---------------------------------------------------------------- geometry */

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Limits for the user's repositioning of a slot (SPEC.md §4).
 *
 * Movable slots may be dragged anywhere on the canvas — out of their frame and
 * even partly past the image edge. The only limit is that a slot can never
 * disappear completely (`clampAdjustment` keeps a share of it on canvas), so
 * "lost" elements cannot happen. Scale stays bounded per slot, which is what
 * keeps QR codes scannable and text legible.
 */
export interface Guardrails {
  /** May the user move this slot at all? Decoration stays put. */
  movable: boolean;
  minScale: number;
  maxScale: number;
}

/** Immovable slot — the default when a slot declares no guardrails. */
export const LOCKED: Guardrails = {
  movable: false,
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
    /** Badge fill opacity (0..1, default 1) — the text stays opaque. */
    opacity?: number;
  };
  /**
   * Fixed decorative text (captions, eyebrows like "STECKBRIEF"): always
   * renders `example`, never appears in the editing form.
   */
  fixed?: boolean;
  /**
   * Only render this (fixed) slot when the referenced slot has a value —
   * captions collapse together with their companion content.
   */
  showWith?: string;
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

/* ---------------------------------------------------------------- variants */

/** Safe visual tweaks a style variant may apply to a single slot. */
export interface SlotVariantOverride {
  cornerRadius?: number;
  /** Must keep the slot's color-role pairing readable (same roles). */
  fill?: Fill;
  /** Skip this slot entirely in this variant. */
  hidden?: boolean;
}

/**
 * A curated second look for a template ("Stil" toggle in Anpassen): purely
 * decorative overrides, never layout changes — the guardrail model stays
 * intact. The first variant is the default.
 */
export interface TemplateVariant {
  id: string;
  /** German label, e.g. "Kantig". */
  name: string;
  /** Keyed by slot id; unlisted slots render unchanged. */
  overrides: Record<string, SlotVariantOverride>;
}

/* ----------------------------------------------------------------- content */

/**
 * The universal content fields (SPEC.md §3/§5). The user fills these in
 * *before* choosing a template; every template maps them onto its own design,
 * which is what lets her flip through all templates with her real content.
 *
 * A text slot carrying one of these ids is fed by that field. On two-page
 * templates everything numbered "2" belongs to the second image.
 */
export const CONTENT_SLOT_IDS = ["title1", "text1", "title2", "text2"] as const;

export type ContentSlotId = (typeof CONTENT_SLOT_IDS)[number];

export const CONTENT_LABELS: Record<ContentSlotId, string> = {
  title1: "Überschrift 1",
  text1: "Beschreibungstext 1",
  title2: "Überschrift 2",
  text2: "Beschreibungstext 2",
};

export function isContentSlot(id: string): id is ContentSlotId {
  return (CONTENT_SLOT_IDS as readonly string[]).includes(id);
}

/* ---------------------------------------------------------------- template */

export interface Template {
  id: string;
  /** German display name. */
  name: string;
  /** One-line German hint under the name in the picker ("Für Angebote"). */
  hint: string;
  /** First palette is the default. */
  palettes: Palette[];
  /** Draw order = array order (background first). */
  slots: Slot[];
  /**
   * Carousel templates: number of swipeable images this template exports
   * (default 1). With N slides, slot frames live in an N× wide coordinate
   * space (x ∈ [0, N·width]); slide k shows the window [k·width, (k+1)·width].
   * A photo/background spanning several slides therefore continues seamlessly
   * across the swipe — the "long dachshund" effect.
   */
  slides?: number;
  /** Optional style variants ("Stil" toggle); the first one is the default. */
  variants?: TemplateVariant[];
}

/** The variant to render: explicit id, falling back to the first (default). */
export function activeVariant(
  template: Template,
  variantId?: string | null,
): TemplateVariant | undefined {
  const variants = template.variants;
  if (!variants || variants.length === 0) return undefined;
  return variants.find((v) => v.id === variantId) ?? variants[0];
}

/** Number of exported images for a template (1 for normal templates). */
export function templateSlides(template: Template): number {
  return Math.max(1, Math.floor(template.slides ?? 1));
}

/* ------------------------------------------------------------------ values */

/** Pan/zoom crop of the photo inside its slot (driven by task 05 gestures). */
export interface CropState {
  /**
   * 1 = exact cover fit; clamped to [MIN_ZOOM, MAX_ZOOM]. Below 1 the photo is
   * smaller than its slot and the renderer fills the gap with a blurred copy
   * of the photo.
   */
  zoom: number;
  /**
   * -1..1 — position along each axis (0 = centered). Zoomed in it pans across
   * the hidden part of the photo, zoomed out it slides the photo between the
   * frame's edges.
   */
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

/**
 * Font families the user may switch a single text field to (SPEC.md §6).
 * "vorlage" keeps whatever the template chose — the default everywhere.
 */
export type FontChoice =
  | "vorlage"
  | "modern"
  | "elegant"
  | "kraeftig"
  | "handschrift";

export interface TextValue {
  type: "text";
  text: string;
  /** Per-field formatting; absent = the template's own styling. */
  bold?: boolean;
  italic?: boolean;
  font?: FontChoice;
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
  /**
   * Catalog previews: render optional text slots with their example content
   * so templates look finished before the user edits anything.
   */
  previewExamples?: boolean;
  /**
   * Which slide of a carousel template to render (0-based, default 0).
   * Ignored for normal single-image templates.
   */
  slide?: number;
  /** Style variant to render; default is the template's first variant. */
  variantId?: string;
}
