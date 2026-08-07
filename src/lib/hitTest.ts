/**
 * Hit-testing for the Anpassen step (task 08): which adjustable element sits
 * under a tap? Only slots that declare guardrails are adjustable; the topmost
 * (last-drawn) one wins. Pure function — unit-tested.
 */
import { effectiveFrame } from "../engine/render";
import type { RenderInput, Template } from "../engine/types";

/** Generous touch padding around small elements (canvas pixels). */
const HIT_PADDING = 24;

export function findAdjustableSlotAt(
  template: Template,
  formatId: RenderInput["formatId"],
  adjustments: RenderInput["adjustments"],
  x: number,
  y: number,
): string | null {
  for (let i = template.slots.length - 1; i >= 0; i--) {
    const slot = template.slots[i];
    if (!slot?.guardrails) continue;
    const frame = effectiveFrame(slot, formatId, adjustments);
    if (
      x >= frame.x - HIT_PADDING &&
      x <= frame.x + frame.w + HIT_PADDING &&
      y >= frame.y - HIT_PADDING &&
      y <= frame.y + frame.h + HIT_PADDING
    ) {
      return slot.id;
    }
  }
  return null;
}
