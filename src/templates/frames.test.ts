/**
 * Geometry sanity for every registered template: hand-set frames must stay
 * inside the (possibly slide-widened) canvas for all three formats. This is
 * what catches typos in the 2160-wide carousel coordinate space.
 */
import { describe, expect, it } from "vitest";
import { activeVariant, templateSlides } from "../engine/types";
import { POST_FORMATS } from "../lib/formats";
import { getTemplate, TEMPLATES } from "./catalog";

describe("template frame geometry", () => {
  for (const template of TEMPLATES) {
    const slides = templateSlides(template);
    it(`${template.id}: frames stay inside the ${slides}-slide canvas`, () => {
      for (const slot of template.slots) {
        for (const format of POST_FORMATS) {
          const frame = slot.frames[format.id];
          const where = `${slot.id} (${format.id})`;
          expect(frame, where).toBeDefined();
          expect(frame.w, where).toBeGreaterThan(0);
          expect(frame.h, where).toBeGreaterThan(0);
          expect(frame.x, where).toBeGreaterThanOrEqual(0);
          expect(frame.y, where).toBeGreaterThanOrEqual(0);
          expect(frame.x + frame.w, where).toBeLessThanOrEqual(
            slides * format.width,
          );
          expect(frame.y + frame.h, where).toBeLessThanOrEqual(format.height);
        }
      }
    });
  }
});

describe("template style variants", () => {
  for (const template of TEMPLATES.filter((t) => t.variants?.length)) {
    it(`${template.id}: variants are unique and reference real slots`, () => {
      const variants = template.variants ?? [];
      const ids = variants.map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
      const slotIds = new Set(template.slots.map((s) => s.id));
      for (const variant of variants) {
        for (const slotId of Object.keys(variant.overrides)) {
          expect(slotIds.has(slotId), `${variant.id} → ${slotId}`).toBe(true);
        }
      }
    });
  }

  it("falls back to the first (default) variant for unknown ids", () => {
    const template = getTemplate("produkt-klassik");
    expect(template).toBeDefined();
    if (!template) return;
    expect(activeVariant(template, undefined)?.id).toBe(
      template.variants?.[0]?.id,
    );
    expect(activeVariant(template, "gibt-es-nicht")?.id).toBe(
      template.variants?.[0]?.id,
    );
    expect(activeVariant(template, "kantig")?.id).toBe("kantig");
  });
});

describe("templateSlides", () => {
  it("defaults to a single image", () => {
    const single = getTemplate("hund-steckbrief");
    expect(single && templateSlides(single)).toBe(1);
  });

  it("reports both slides of the carousel template", () => {
    const carousel = getTemplate("hund-karussell");
    expect(carousel && templateSlides(carousel)).toBe(2);
  });
});
