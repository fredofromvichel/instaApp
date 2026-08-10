/**
 * Pure helpers for the RTF-lite editor (SPEC.md §6): keeping a TextValue's
 * spans consistent while the user edits text and applies formatting to
 * selections. No DOM — unit-tested in textSpans.test.ts.
 */
import type { TextSpan, TextValue } from "../engine/types";

/** Everything a span can set, resolved for one character position. */
export interface EffectiveStyle {
  bold: boolean;
  italic: boolean;
  color?: string;
  size: number;
}

/** The style in effect at `index` (base field style + spans, later wins). */
export function effectiveStyleAt(
  value: Pick<TextValue, "bold" | "italic" | "spans">,
  index: number,
): EffectiveStyle {
  const style: EffectiveStyle = {
    bold: value.bold === true,
    italic: value.italic === true,
    size: 1,
  };
  for (const span of value.spans ?? []) {
    if (span.start <= index && index < span.end) {
      if (span.bold !== undefined) style.bold = span.bold;
      if (span.italic !== undefined) style.italic = span.italic;
      if (span.color !== undefined) style.color = span.color;
      if (span.size !== undefined) style.size = span.size;
    }
  }
  return style;
}

/** Cap so a wild formatting session cannot grow drafts without bound. */
const MAX_SPANS = 120;

/**
 * Apply a formatting patch to [start, end). Appending wins over everything
 * underneath; the list is compacted by dropping spans that are fully covered
 * by later ones with the same keys.
 */
export function applySpan(
  spans: TextSpan[] | undefined,
  start: number,
  end: number,
  patch: Omit<TextSpan, "start" | "end">,
): TextSpan[] {
  if (start >= end) return spans ?? [];
  const next = [...(spans ?? []), { start, end, ...patch }];
  const keysOf = (s: TextSpan) =>
    (["bold", "italic", "color", "size"] as const).filter(
      (k) => s[k] !== undefined,
    );
  const compacted = next.filter((span, i) => {
    const laterCovers = next.slice(i + 1).some((later) => {
      const keys = keysOf(span);
      return (
        later.start <= span.start &&
        later.end >= span.end &&
        keys.every((k) => later[k] !== undefined)
      );
    });
    return !laterCovers;
  });
  return compacted.slice(-MAX_SPANS);
}

/**
 * Shift spans after a text edit. The edit is located via the longest common
 * prefix/suffix of old and new text (how a single keystroke, paste, or
 * autocorrect replacement looks); boundaries inside the replaced region are
 * clamped to it.
 */
export function remapSpans(
  spans: TextSpan[] | undefined,
  oldText: string,
  newText: string,
): TextSpan[] | undefined {
  if (!spans || spans.length === 0 || oldText === newText) return spans;
  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length);
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < maxPrefix - prefix &&
    oldText[oldText.length - 1 - suffix] ===
      newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const oldKeep = oldText.length - suffix;
  const delta = newText.length - oldText.length;
  const clampInto = (b: number) =>
    Math.min(prefix + Math.max(0, b - prefix), oldKeep + delta);
  // Typing exactly at a span boundary must not extend the span: a start on
  // the edit position shifts right, an end on it stays put.
  const shiftStart = (b: number) =>
    b >= oldKeep ? b + delta : b <= prefix ? b : clampInto(b);
  const shiftEnd = (b: number) =>
    b <= prefix ? b : b >= oldKeep ? b + delta : clampInto(b);
  const remapped = spans
    .map((span) => ({
      ...span,
      start: shiftStart(span.start),
      end: shiftEnd(span.end),
    }))
    .map((span) => ({
      ...span,
      start: Math.max(0, Math.min(newText.length, span.start)),
      end: Math.max(0, Math.min(newText.length, span.end)),
    }))
    .filter((span) => span.start < span.end);
  return remapped.length > 0 ? remapped : undefined;
}
