/**
 * Template catalog: the single registry the template picker reads.
 * Template-set tasks (10–12) register their templates here.
 */
import type { Template, TemplateCategory } from "../engine/types";
import { productTemplates } from "./products";
import { quoteTemplates } from "./quotes";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  products: "Produkte & Angebote",
  quotes: "Zitate & Tipps",
  dogs: "Hunde-Steckbriefe",
};

export const CATEGORIES: TemplateCategory[] = ["products", "quotes", "dogs"];

export const TEMPLATES: Template[] = [...productTemplates, ...quoteTemplates];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}
