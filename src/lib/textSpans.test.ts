import { describe, expect, it } from "vitest";
import { applySpan, effectiveStyleAt, remapSpans } from "./textSpans";

describe("applySpan / effectiveStyleAt", () => {
  it("formats a selection and reads it back", () => {
    const spans = applySpan(undefined, 2, 5, { bold: true });
    expect(effectiveStyleAt({ spans }, 3).bold).toBe(true);
    expect(effectiveStyleAt({ spans }, 1).bold).toBe(false);
    expect(effectiveStyleAt({ spans }, 5).bold).toBe(false);
  });

  it("later spans win where they overlap", () => {
    let spans = applySpan(undefined, 0, 10, { color: "accent" });
    spans = applySpan(spans, 3, 6, { color: "#ff0000" });
    expect(effectiveStyleAt({ spans }, 1).color).toBe("accent");
    expect(effectiveStyleAt({ spans }, 4).color).toBe("#ff0000");
  });

  it("un-bolding a bolded range works (explicit false wins)", () => {
    let spans = applySpan(undefined, 0, 10, { bold: true });
    spans = applySpan(spans, 2, 4, { bold: false });
    expect(effectiveStyleAt({ spans }, 3).bold).toBe(false);
    expect(effectiveStyleAt({ spans }, 5).bold).toBe(true);
  });

  it("field-level styling is the base for span overrides", () => {
    const spans = applySpan(undefined, 0, 3, { italic: false });
    const style = effectiveStyleAt({ italic: true, spans }, 1);
    expect(style.italic).toBe(false);
    expect(effectiveStyleAt({ italic: true, spans }, 4).italic).toBe(true);
  });

  it("drops spans fully covered by a later span with the same keys", () => {
    let spans = applySpan(undefined, 2, 5, { color: "#111111" });
    spans = applySpan(spans, 0, 10, { color: "#222222" });
    expect(spans).toHaveLength(1);
    expect(spans[0]?.color).toBe("#222222");
  });
});

describe("remapSpans", () => {
  const spans = [{ start: 5, end: 10, bold: true }];

  it("shifts spans right of an insertion", () => {
    // "Hallo Welt" → "Hallo, Welt": insert at 5.
    const next = remapSpans(spans, "Hallo Welt", "Hallo, Welt");
    expect(next).toEqual([{ start: 6, end: 11, bold: true }]);
  });

  it("keeps spans left of an edit untouched", () => {
    const s = [{ start: 0, end: 3, bold: true }];
    const next = remapSpans(s, "Abc def", "Abc defg");
    expect(next).toEqual([{ start: 0, end: 3, bold: true }]);
  });

  it("shrinks spans when their text is deleted", () => {
    // Delete "Welt" (chars 6-10 of "Hallo Welt!").
    const s = [{ start: 6, end: 10, bold: true }];
    const next = remapSpans(s, "Hallo Welt!", "Hallo !");
    expect(next).toBeUndefined();
  });

  it("survives a full rewrite by clamping into the text", () => {
    const next = remapSpans(spans, "Hallo Welt", "Servus");
    for (const span of next ?? []) {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.end).toBeLessThanOrEqual("Servus".length);
      expect(span.start).toBeLessThan(span.end);
    }
  });

  it("is a no-op when the text did not change", () => {
    expect(remapSpans(spans, "abc", "abc")).toBe(spans);
  });
});
