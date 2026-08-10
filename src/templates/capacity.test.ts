/**
 * The promise behind the description fields: **whatever fits in the input box
 * can also be shown**. Auto-fit shrinks text to `minSize` and truncates with
 * an ellipsis beyond that (engine/text.ts), so a slot that is too small simply
 * eats the end of a text — silently, and differently per template. This test
 * makes that impossible to ship.
 *
 * Measurement is the engine's own auto-fit with an injected average character
 * width, deliberately a bit wider than the real body fonts so the guarantee
 * has headroom.
 */
import { describe, expect, it } from "vitest";
import { autoFitText } from "../engine/text";
import type { TextSlot } from "../engine/types";
import { CONTENT_TEXT_LIMIT } from "../engine/types";
import { POST_FORMATS } from "../lib/formats";
import { TEMPLATES } from "./catalog";

/** Average advance width as a fraction of the font size (conservative). */
const AVG_CHAR_WIDTH = 0.55;

const measure = (text: string, fontSize: number) =>
  text.length * fontSize * AVG_CHAR_WIDTH;

const SAMPLE =
  "Bello ist ein fröhlicher Hund, der Menschen liebt und gern Neues lernt. ".repeat(
    40,
  );

function fitsWithoutTruncation(
  slot: TextSlot,
  formatId: "square" | "portrait" | "story",
  characters: number,
): boolean {
  const frame = slot.frames[formatId];
  return !autoFitText(SAMPLE.slice(0, characters), {
    maxWidth: frame.w,
    maxHeight: frame.h,
    maxLines: slot.maxLines,
    minSize: slot.font.minSize,
    maxSize: slot.font.maxSize,
    lineHeight: slot.font.lineHeight,
    measure,
  }).overflow;
}

describe("description capacity", () => {
  for (const template of TEMPLATES) {
    const descriptions = template.slots.filter(
      (slot): slot is TextSlot =>
        slot.type === "text" && (slot.id === "text1" || slot.id === "text2"),
    );

    for (const slot of descriptions) {
      it(`${template.id}/${slot.id}: shows a full-length description`, () => {
        for (const format of POST_FORMATS) {
          expect(
            fitsWithoutTruncation(slot, format.id, CONTENT_TEXT_LIMIT),
            `${template.id}/${slot.id} (${format.id})`,
          ).toBe(true);
        }
      });
    }

    it(`${template.id}: has both description slots`, () => {
      expect(descriptions).toHaveLength(2);
    });
  }
});
