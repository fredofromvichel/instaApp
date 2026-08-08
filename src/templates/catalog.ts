/**
 * Template catalog: the single registry the template picker reads.
 * Template-set tasks (10–12) register their templates here.
 */
import type { Template, TemplateCategory } from "../engine/types";
import { dogTemplates } from "./dogs";
import { productTemplates } from "./products";
import { quoteTemplates } from "./quotes";
import { teamTemplates } from "./team";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  products: "Produkte & Angebote",
  quotes: "Zitate & Tipps",
  dogs: "Hunde-Steckbriefe",
  team: "Team & Hinweise",
};

export const CATEGORIES: TemplateCategory[] = [
  "products",
  "quotes",
  "dogs",
  "team",
];

export const TEMPLATES: Template[] = [
  ...productTemplates,
  ...quoteTemplates,
  ...dogTemplates,
  ...teamTemplates,
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}
