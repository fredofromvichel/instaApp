/**
 * Hard-coded sample template proving the engine (task 03). The real,
 * professionally designed template sets arrive with tasks 10–12 — this one
 * demonstrates every slot type, palettes, guardrails, and all three formats.
 */
import type { Palette, Template } from "../engine/types";

const palettes: Palette[] = [
  {
    id: "terracotta",
    name: "Terrakotta",
    colors: {
      background: "#f7f2ec",
      surface: "#ffffff",
      accent: "#c96f4a",
      text: "#2a2621",
      textOnAccent: "#ffffff",
      muted: "#8a7f70",
    },
  },
  {
    id: "sage",
    name: "Salbei",
    colors: {
      background: "#eef2ec",
      surface: "#ffffff",
      accent: "#5f7a61",
      text: "#232a24",
      textOnAccent: "#ffffff",
      muted: "#75806f",
    },
  },
  {
    id: "night",
    name: "Nachtblau",
    colors: {
      background: "#e9edf4",
      surface: "#ffffff",
      accent: "#2f4a6e",
      text: "#1e2430",
      textOnAccent: "#ffffff",
      muted: "#6e7787",
    },
  },
];

export const sampleTemplate: Template = {
  id: "sample-offer",
  name: "Angebot Klassik",
  category: "products",
  palettes,
  slots: [
    {
      id: "bg",
      type: "background",
      fill: { type: "solid", role: "background" },
      frames: {
        square: { x: 0, y: 0, w: 1080, h: 1080 },
        portrait: { x: 0, y: 0, w: 1080, h: 1350 },
        story: { x: 0, y: 0, w: 1080, h: 1920 },
      },
    },
    {
      id: "photo",
      type: "photo",
      frames: {
        square: { x: 0, y: 0, w: 1080, h: 600 },
        portrait: { x: 0, y: 0, w: 1080, h: 800 },
        story: { x: 0, y: 0, w: 1080, h: 1100 },
      },
    },
    {
      id: "panel",
      type: "shape",
      shape: "rect",
      fill: { type: "solid", role: "surface" },
      cornerRadius: 48,
      frames: {
        square: { x: 0, y: 560, w: 1080, h: 520 },
        portrait: { x: 0, y: 760, w: 1080, h: 590 },
        story: { x: 0, y: 1060, w: 1080, h: 860 },
      },
    },
    {
      id: "headline",
      type: "text",
      role: "headline",
      label: "Überschrift",
      font: {
        family: "system-ui, sans-serif",
        weight: 700,
        minSize: 40,
        maxSize: 76,
        lineHeight: 1.15,
      },
      color: "text",
      align: "left",
      vAlign: "bottom",
      maxLines: 2,
      maxChars: 60,
      example: "Frisch gebackenes Sauerteigbrot",
      frames: {
        square: { x: 64, y: 620, w: 952, h: 180 },
        portrait: { x: 64, y: 820, w: 952, h: 180 },
        story: { x: 64, y: 1130, w: 952, h: 220 },
      },
    },
    {
      id: "description",
      type: "text",
      role: "description",
      label: "Beschreibung",
      multiline: true,
      font: {
        family: "system-ui, sans-serif",
        weight: 400,
        minSize: 24,
        maxSize: 34,
        lineHeight: 1.35,
      },
      color: "muted",
      align: "left",
      vAlign: "top",
      maxLines: 4,
      maxChars: 160,
      example:
        "Jeden Samstag ab 8 Uhr im Hofladen – solange der Vorrat reicht.",
      frames: {
        square: { x: 64, y: 830, w: 620, h: 200 },
        portrait: { x: 64, y: 1030, w: 620, h: 220 },
        story: { x: 64, y: 1390, w: 700, h: 260 },
      },
    },
    {
      id: "price",
      type: "text",
      role: "price",
      label: "Preis",
      font: {
        family: "system-ui, sans-serif",
        weight: 700,
        minSize: 28,
        maxSize: 44,
        lineHeight: 1.1,
        uppercase: false,
      },
      color: "textOnAccent",
      align: "center",
      vAlign: "center",
      maxLines: 1,
      maxChars: 12,
      badge: {
        fill: { type: "solid", role: "accent" },
        paddingX: 36,
        paddingY: 22,
        cornerRadius: 999,
      },
      example: "4,50 €",
      // The one repositionable element in the sample — demos guardrails.
      guardrails: {
        maxOffsetX: 60,
        maxOffsetY: 60,
        minScale: 0.8,
        maxScale: 1.25,
      },
      frames: {
        square: { x: 760, y: 820, w: 256, h: 110 },
        portrait: { x: 760, y: 1050, w: 256, h: 110 },
        story: { x: 740, y: 1420, w: 276, h: 120 },
      },
    },
    {
      id: "qr",
      type: "qr",
      optional: true,
      frames: {
        square: { x: 900, y: 944, w: 116, h: 116 },
        portrait: { x: 900, y: 1198, w: 116, h: 116 },
        story: { x: 880, y: 1720, w: 136, h: 136 },
      },
    },
    {
      id: "logo",
      type: "logo",
      optional: true,
      frames: {
        square: { x: 48, y: 48, w: 130, h: 130 },
        portrait: { x: 48, y: 48, w: 130, h: 130 },
        story: { x: 48, y: 64, w: 150, h: 150 },
      },
    },
  ],
};
