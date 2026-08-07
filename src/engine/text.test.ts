import { describe, expect, it } from "vitest";
import { autoFitText, type MeasureFn, wrapText } from "./text";

/** Fake monospace metrics: every character is 0.5 × fontSize wide. */
const measure: MeasureFn = (text, fontSize) => text.length * fontSize * 0.5;

describe("wrapText", () => {
  it("keeps short text on one line", () => {
    expect(wrapText("Hallo Welt", 20, 1000, measure)).toEqual(["Hallo Welt"]);
  });

  it("wraps greedily at the max width", () => {
    // At size 20 each char is 10px → "Hallo Welt" = 100px.
    expect(wrapText("Hallo Welt du da", 20, 100, measure)).toEqual([
      "Hallo Welt",
      "du da",
    ]);
  });

  it("respects explicit newlines", () => {
    expect(wrapText("Hallo\nWelt", 20, 1000, measure)).toEqual([
      "Hallo",
      "Welt",
    ]);
  });

  it("hard-breaks a single overlong word by characters", () => {
    // 4 chars fit into 40px at size 20.
    expect(wrapText("Donaudampfschiff", 20, 40, measure)).toEqual([
      "Dona",
      "udam",
      "pfsc",
      "hiff",
    ]);
  });
});

describe("autoFitText", () => {
  const base = {
    maxWidth: 200,
    maxHeight: 1000,
    maxLines: 3,
    minSize: 10,
    maxSize: 40,
    lineHeight: 1.2,
    measure,
  };

  it("uses the max size when everything fits", () => {
    // "Hallo" at 40 → 5 × 20 = 100px ≤ 200.
    const result = autoFitText("Hallo", base);
    expect(result).toEqual({ fontSize: 40, lines: ["Hallo"], overflow: false });
  });

  it("shrinks until the line count fits", () => {
    // 21 chars on one line: needs size ≤ 200/(21×0.5) ≈ 19.04 → 19.
    const result = autoFitText("Hallo Welt wie geht's", {
      ...base,
      maxLines: 1,
    });
    expect(result.fontSize).toBe(19);
    expect(result.lines).toHaveLength(1);
    expect(result.overflow).toBe(false);
  });

  it("shrinks until the block height fits", () => {
    // Force two lines and a tight height: 2 × size × 1.2 ≤ 48 → size ≤ 20.
    const result = autoFitText("Hallo Welt", {
      ...base,
      maxWidth: 100,
      maxHeight: 48,
    });
    expect(result.fontSize).toBeLessThanOrEqual(20);
    expect(result.overflow).toBe(false);
  });

  it("truncates with an ellipsis when even minSize overflows", () => {
    const longText = Array(50).fill("Wort").join(" ");
    const result = autoFitText(longText, { ...base, maxLines: 2 });
    expect(result.overflow).toBe(true);
    expect(result.fontSize).toBe(10);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[1]?.endsWith("…")).toBe(true);
    // Truncated lines still respect the width limit.
    for (const line of result.lines) {
      expect(measure(line, 10)).toBeLessThanOrEqual(base.maxWidth);
    }
  });

  it("returns no lines for empty or whitespace-only text", () => {
    expect(autoFitText("   ", base)).toEqual({
      fontSize: 40,
      lines: [],
      overflow: false,
    });
  });
});
