/**
 * Template catalog: the single registry the template picker reads.
 *
 * One flat list, no categories — the user brings her content and flips through
 * eight designs to see where it looks best (SPEC.md §3). Single-image
 * templates come first, the two-page ones last.
 */
import type { Template } from "../engine/types";
import { pageTemplates } from "./pages";
import { singleTemplates } from "./single";

export const TEMPLATES: Template[] = [...singleTemplates, ...pageTemplates];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
