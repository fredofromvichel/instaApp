/**
 * The two-page templates (Instagram carousel: two images the follower swipes
 * through). Slot frames live in a 2160-wide space; page 1 is x 0–1080, page 2
 * is x 1080–2160 (`onPage2`).
 *
 * The rule the user is told once and can then rely on: **everything numbered
 * "2" lands on the second image.**
 *
 * The two differ in what page 2 *is*: "Panorama" continues the photo across
 * the swipe, "Doppel-Post" gives page 2 a text card and no photo at all.
 */
import type { Template } from "../engine/types";
import { PALETTES } from "./palettes";
import {
  LOGO_RAILS,
  onPage2,
  PHOTO_RAILS,
  QR_RAILS,
  SANS,
  SERIF,
  TEXT_RAILS,
  WIDE_FRAMES,
} from "./shared";

/* ----------------------------------------------------------------- Panorama */

/** One continuous photo across both images — the "long dog" effect. */
const panorama: Template = {
  id: "panorama",
  name: "Panorama (2 Bilder)",
  hint: "Ein Foto läuft über beide Bilder weiter",
  slides: 2,
  palettes: PALETTES,
  variants: [
    { id: "kraeftig", name: "Kräftiger Verlauf", overrides: {} },
    {
      id: "dezent",
      name: "Dezenter Verlauf",
      overrides: {
        scrim: {
          fill: {
            type: "scrim",
            role: "text",
            direction: "down",
            opacity: 0.5,
          },
        },
      },
    },
  ],
  slots: [
    {
      id: "bg",
      type: "background",
      fill: { type: "solid", role: "background" },
      frames: WIDE_FRAMES,
    },
    {
      id: "photo",
      type: "photo",
      guardrails: PHOTO_RAILS,
      frames: WIDE_FRAMES,
    },
    {
      id: "scrim",
      type: "shape",
      shape: "rect",
      fill: { type: "scrim", role: "text", direction: "down", opacity: 0.72 },
      frames: {
        square: { x: 0, y: 620, w: 2160, h: 460 },
        portrait: { x: 0, y: 810, w: 2160, h: 540 },
        story: { x: 0, y: 1180, w: 2160, h: 740 },
      },
    },
    {
      id: "title1",
      type: "text",
      role: "headline",
      label: "Überschrift 1",
      font: {
        family: SERIF,
        weight: 600,
        minSize: 64,
        maxSize: 108,
        lineHeight: 1.05,
      },
      color: "textOnAccent",
      align: "left",
      vAlign: "bottom",
      maxLines: 2,
      maxChars: 30,
      example: "Waldemar",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 64, y: 780, w: 860, h: 150 },
        portrait: { x: 64, y: 1030, w: 860, h: 170 },
        story: { x: 64, y: 1560, w: 860, h: 190 },
      },
    },
    {
      id: "text1",
      type: "text",
      role: "description",
      label: "Beschreibungstext 1",
      optional: true,
      font: {
        family: SANS,
        weight: 500,
        minSize: 12,
        maxSize: 34,
        lineHeight: 1.3,
      },
      color: "textOnAccent",
      align: "left",
      vAlign: "top",
      multiline: true,
      maxLines: 12,
      example: "Der längste Dackel der Stadt",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 64, y: 940, w: 860, h: 106 },
        portrait: { x: 64, y: 1210, w: 860, h: 120 },
        story: { x: 64, y: 1760, w: 860, h: 140 },
      },
    },
    {
      id: "swipe-hint",
      type: "text",
      role: "caption",
      label: "",
      fixed: true,
      font: {
        family: SANS,
        weight: 700,
        minSize: 24,
        maxSize: 28,
        lineHeight: 1.2,
      },
      color: "textOnAccent",
      align: "right",
      vAlign: "center",
      maxLines: 1,
      badge: {
        fill: { type: "solid", role: "accent" },
        paddingX: 26,
        paddingY: 14,
        cornerRadius: 999,
        // Semi-transparent so the photo stays visible behind the hint.
        opacity: 0.72,
      },
      example: "Weiter wischen ➜",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 580, y: 494, w: 420, h: 40 },
        portrait: { x: 580, y: 630, w: 420, h: 40 },
        story: { x: 580, y: 900, w: 420, h: 44 },
      },
    },
    {
      id: "title2",
      type: "text",
      role: "headline",
      label: "Überschrift 2",
      optional: true,
      font: {
        family: SERIF,
        weight: 600,
        minSize: 44,
        maxSize: 76,
        lineHeight: 1.1,
      },
      color: "textOnAccent",
      align: "left",
      vAlign: "bottom",
      maxLines: 2,
      maxChars: 40,
      example: "… und hinten hört er nicht auf",
      guardrails: TEXT_RAILS,
      frames: onPage2({
        square: { x: 64, y: 620, w: 820, h: 120 },
        portrait: { x: 64, y: 860, w: 820, h: 130 },
        story: { x: 64, y: 1330, w: 820, h: 150 },
      }),
    },
    {
      id: "text2",
      type: "text",
      role: "description",
      label: "Beschreibungstext 2",
      optional: true,
      multiline: true,
      font: {
        family: SANS,
        weight: 500,
        minSize: 14,
        maxSize: 44,
        lineHeight: 1.3,
      },
      color: "textOnAccent",
      align: "left",
      vAlign: "top",
      maxLines: 14,
      example:
        "Waldemar sucht ein Zuhause mit ganz viel Platz zum Strecken – am liebsten mit Garten.",
      guardrails: TEXT_RAILS,
      frames: onPage2({
        square: { x: 64, y: 760, w: 820, h: 250 },
        portrait: { x: 64, y: 1010, w: 820, h: 270 },
        story: { x: 64, y: 1500, w: 820, h: 340 },
      }),
    },
    {
      id: "qr",
      type: "qr",
      optional: true,
      cornerRadius: 16,
      guardrails: QR_RAILS,
      frames: onPage2({
        square: { x: 916, y: 916, w: 100, h: 100 },
        portrait: { x: 916, y: 1186, w: 100, h: 100 },
        story: { x: 896, y: 1736, w: 120, h: 120 },
      }),
    },
    {
      id: "logo",
      type: "logo",
      optional: true,
      guardrails: LOGO_RAILS,
      frames: onPage2({
        square: { x: 876, y: 64, w: 140, h: 140 },
        portrait: { x: 876, y: 64, w: 140, h: 140 },
        story: { x: 856, y: 72, w: 160, h: 160 },
      }),
    },
  ],
};

/* -------------------------------------------------------------- Doppel-Post */

/** Photo page + a text-only second page — for a post that needs room. */
const doppelpost: Template = {
  id: "doppelpost",
  name: "Doppel-Post (2 Bilder)",
  hint: "Bild vorn, zweite Seite nur Text",
  slides: 2,
  palettes: PALETTES,
  variants: [
    { id: "weich", name: "Abgerundet", overrides: {} },
    {
      id: "kantig",
      name: "Kantig",
      overrides: { card: { cornerRadius: 0 }, frame2: { cornerRadius: 0 } },
    },
  ],
  slots: [
    {
      id: "bg",
      type: "background",
      fill: { type: "solid", role: "background" },
      frames: WIDE_FRAMES,
    },
    {
      // Accent border around page 2's card — the color highlight of this
      // template, drawn as a shape so the background role stays the
      // background (see ColorRole in engine/types.ts).
      id: "frame2",
      type: "shape",
      shape: "rect",
      fill: { type: "solid", role: "accent" },
      cornerRadius: 64,
      frames: onPage2({
        square: { x: 32, y: 32, w: 1016, h: 1016 },
        portrait: { x: 32, y: 32, w: 1016, h: 1286 },
        story: { x: 32, y: 64, w: 1016, h: 1792 },
      }),
    },
    {
      id: "photo",
      type: "photo",
      guardrails: PHOTO_RAILS,
      frames: {
        square: { x: 0, y: 0, w: 1080, h: 1080 },
        portrait: { x: 0, y: 0, w: 1080, h: 1350 },
        story: { x: 0, y: 0, w: 1080, h: 1920 },
      },
    },
    {
      id: "scrim",
      type: "shape",
      shape: "rect",
      fill: { type: "scrim", role: "text", direction: "down", opacity: 0.85 },
      frames: {
        square: { x: 0, y: 440, w: 1080, h: 640 },
        portrait: { x: 0, y: 600, w: 1080, h: 750 },
        story: { x: 0, y: 980, w: 1080, h: 940 },
      },
    },
    {
      id: "title1",
      type: "text",
      role: "headline",
      label: "Überschrift 1",
      font: {
        family: SANS,
        weight: 800,
        minSize: 52,
        maxSize: 84,
        lineHeight: 1.08,
      },
      color: "background",
      align: "left",
      vAlign: "bottom",
      maxLines: 3,
      maxChars: 70,
      example: "Unser Sommerfest",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 64, y: 700, w: 880, h: 240 },
        portrait: { x: 64, y: 920, w: 880, h: 260 },
        story: { x: 64, y: 1340, w: 900, h: 300 },
      },
    },
    {
      id: "text1",
      type: "text",
      role: "description",
      label: "Beschreibungstext 1",
      optional: true,
      font: {
        family: SANS,
        weight: 500,
        minSize: 13,
        maxSize: 34,
        lineHeight: 1.3,
      },
      color: "background",
      align: "left",
      vAlign: "top",
      multiline: true,
      maxLines: 12,
      example: "Samstag, 12. Juli · ab 14 Uhr",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 64, y: 956, w: 880, h: 90 },
        portrait: { x: 64, y: 1196, w: 880, h: 100 },
        story: { x: 64, y: 1660, w: 900, h: 110 },
      },
    },
    {
      id: "swipe-hint",
      type: "text",
      role: "caption",
      label: "",
      fixed: true,
      font: {
        family: SANS,
        weight: 700,
        minSize: 24,
        maxSize: 28,
        lineHeight: 1.2,
      },
      color: "textOnAccent",
      align: "right",
      vAlign: "center",
      maxLines: 1,
      badge: {
        fill: { type: "solid", role: "accent" },
        paddingX: 26,
        paddingY: 14,
        cornerRadius: 999,
        opacity: 0.72,
      },
      example: "Weiter wischen ➜",
      guardrails: TEXT_RAILS,
      frames: {
        square: { x: 580, y: 360, w: 420, h: 40 },
        portrait: { x: 580, y: 500, w: 420, h: 40 },
        story: { x: 580, y: 840, w: 420, h: 44 },
      },
    },
    {
      id: "card",
      type: "shape",
      shape: "rect",
      fill: { type: "solid", role: "surface" },
      cornerRadius: 48,
      frames: onPage2({
        square: { x: 64, y: 64, w: 952, h: 952 },
        portrait: { x: 64, y: 64, w: 952, h: 1222 },
        story: { x: 64, y: 96, w: 952, h: 1728 },
      }),
    },
    {
      id: "title2",
      type: "text",
      role: "headline",
      label: "Überschrift 2",
      optional: true,
      font: {
        family: SERIF,
        weight: 600,
        minSize: 44,
        maxSize: 76,
        lineHeight: 1.12,
      },
      color: "text",
      align: "left",
      vAlign: "bottom",
      maxLines: 3,
      maxChars: 70,
      example: "Was dich erwartet",
      guardrails: TEXT_RAILS,
      frames: onPage2({
        square: { x: 128, y: 180, w: 824, h: 280 },
        portrait: { x: 128, y: 200, w: 824, h: 320 },
        story: { x: 128, y: 280, w: 824, h: 420 },
      }),
    },
    {
      id: "text2",
      type: "text",
      role: "description",
      label: "Beschreibungstext 2",
      optional: true,
      multiline: true,
      font: {
        family: SANS,
        weight: 400,
        minSize: 14,
        maxSize: 38,
        lineHeight: 1.45,
      },
      color: "muted",
      align: "left",
      vAlign: "top",
      maxLines: 18,
      example:
        "Kuchen, Kaffee und ganz viel Zeit zum Schnacken. Für die Kinder gibt es eine Hüpfburg, und um 16 Uhr spielt die Kapelle aus dem Nachbarort.",
      guardrails: TEXT_RAILS,
      frames: onPage2({
        square: { x: 128, y: 500, w: 824, h: 340 },
        portrait: { x: 128, y: 560, w: 824, h: 500 },
        story: { x: 128, y: 760, w: 824, h: 720 },
      }),
    },
    {
      id: "qr",
      type: "qr",
      optional: true,
      guardrails: QR_RAILS,
      frames: onPage2({
        square: { x: 856, y: 856, w: 96, h: 96 },
        portrait: { x: 856, y: 1120, w: 96, h: 96 },
        story: { x: 832, y: 1600, w: 120, h: 120 },
      }),
    },
    {
      id: "logo",
      type: "logo",
      optional: true,
      guardrails: LOGO_RAILS,
      frames: onPage2({
        square: { x: 128, y: 856, w: 88, h: 88 },
        portrait: { x: 128, y: 1120, w: 88, h: 88 },
        story: { x: 128, y: 1600, w: 110, h: 110 },
      }),
    },
  ],
};

export const pageTemplates: Template[] = [panorama, doppelpost];
