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
      background: "#f6efe7",
      surface: "#ffffff",
      accent: "#c4633c",
      text: "#2b2118",
      textOnAccent: "#fff7f0",
      muted: "#94826e",
    },
  },
  {
    id: "sage",
    name: "Salbei",
    colors: {
      background: "#eef1ea",
      surface: "#ffffff",
      accent: "#4e6b51",
      text: "#1f2921",
      textOnAccent: "#f2f7f0",
      muted: "#7c8877",
    },
  },
  {
    id: "night",
    name: "Nachtblau",
    colors: {
      background: "#e8edf5",
      surface: "#ffffff",
      accent: "#23405f",
      text: "#16202e",
      textOnAccent: "#eef4fb",
      muted: "#6c7a8c",
    },
  },
  {
    id: "honey",
    name: "Honig",
    colors: {
      background: "#fbf3e2",
      surface: "#ffffff",
      accent: "#a87718",
      text: "#2e2410",
      textOnAccent: "#fff9ec",
      muted: "#96854f",
    },
  },
  {
    id: "berry",
    name: "Beere",
    colors: {
      background: "#f5ebf0",
      surface: "#ffffff",
      accent: "#8e3b62",
      text: "#2b1b24",
      textOnAccent: "#fbeff5",
      muted: "#8d7583",
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
      background: "#f7efe6",
      surface: "#ffffff",
      accent: "#9e2b2b",
      text: "#2d1c18",
      textOnAccent: "#fdf3ec",
      muted: "#97806f",
    },
  },
  {
    id: "sommer",
    name: "Sommer",
    colors: {
      background: "#eaf4f2",
      surface: "#ffffff",
      accent: "#e0763a",
      text: "#23302e",
      textOnAccent: "#fff4ea",
      muted: "#74908a",
    },
  },
];
