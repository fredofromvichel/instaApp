/**
 * The one curated palette set, shared by every template (SPEC.md §4).
 *
 * One set instead of one per template family is what lets the chosen colors
 * survive switching templates — the user picks content first and then flips
 * through the designs, so nothing may reset behind her back.
 */
import type { Palette } from "../engine/types";

export const PALETTES: Palette[] = [
  {
    id: "terracotta",
    name: "Terrakotta",
    colors: {
      background: "#f3e2d0",
      surface: "#fdf6ee",
      accent: "#c4633c",
      text: "#2b2118",
      textOnAccent: "#fff7f0",
      muted: "#8d7460",
    },
  },
  {
    id: "sage",
    name: "Salbei",
    colors: {
      background: "#dbe4d5",
      surface: "#f3f7f0",
      accent: "#4e6b51",
      text: "#1f2921",
      textOnAccent: "#f2f7f0",
      muted: "#6e7f6a",
    },
  },
  {
    id: "night",
    name: "Nachtblau (dunkel)",
    colors: {
      background: "#16202e",
      surface: "#212e40",
      accent: "#7db0e2",
      text: "#e8eef6",
      textOnAccent: "#0e1826",
      muted: "#93a5bb",
    },
  },
  {
    id: "honey",
    name: "Honig",
    colors: {
      background: "#f5e2b4",
      surface: "#fdf4dc",
      accent: "#a87718",
      text: "#2e2410",
      textOnAccent: "#fff9ec",
      muted: "#8a7a48",
    },
  },
  {
    id: "berry",
    name: "Beere",
    colors: {
      background: "#ecd5e1",
      surface: "#f9eef4",
      accent: "#8e3b62",
      text: "#2b1b24",
      textOnAccent: "#fbeff5",
      muted: "#7d6274",
    },
  },
  {
    id: "edel",
    name: "Schwarz & Gold",
    colors: {
      background: "#232019",
      surface: "#2e2a21",
      accent: "#d4af5a",
      text: "#f1ece0",
      textOnAccent: "#2b2210",
      muted: "#a49a86",
    },
  },
  {
    id: "weihnachten",
    name: "Weihnachten",
    colors: {
      background: "#eedac5",
      surface: "#fbf2e6",
      accent: "#9e2b2b",
      text: "#2d1c18",
      textOnAccent: "#fdf3ec",
      muted: "#8a705c",
    },
  },
  {
    id: "sommer",
    name: "Sommer",
    colors: {
      background: "#cde7e2",
      surface: "#eef8f6",
      accent: "#e0763a",
      text: "#1f322f",
      textOnAccent: "#fff4ea",
      muted: "#5e837c",
    },
  },
];
