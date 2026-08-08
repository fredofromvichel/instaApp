/**
 * Geometry sanity for every registered template: hand-set frames must stay
 * inside the (possibly slide-widened) canvas for all three formats. This is
 * what catches typos in the 2160-wide carousel coordinate space.
 */
import { describe, expect, it } from "vitest";
import { templateSlides } from "../engine/types";
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
