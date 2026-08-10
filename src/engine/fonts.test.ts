import { describe, expect, it } from "vitest";
import { FONT_OPTIONS, fontFamilyOf, fontSizeFactor } from "./fonts";

describe("font options", () => {
  it("offers the template default plus four families", () => {
    expect(FONT_OPTIONS).toHaveLength(5);
    expect(FONT_OPTIONS[0]?.id).toBe("vorlage");
    expect(FONT_OPTIONS.filter((o) => o.family !== null)).toHaveLength(4);
  });

  it("has a German label for every option", () => {
    for (const option of FONT_OPTIONS) {
      expect(option.name.length).toBeGreaterThan(0);
    }
  });
});

describe("fontFamilyOf", () => {
  it("keeps the template's own font for the default", () => {
    expect(fontFamilyOf("vorlage")).toBeNull();
    expect(fontFamilyOf(undefined)).toBeNull();
  });

  it("resolves a chosen family to a self-hosted stack", () => {
    expect(fontFamilyOf("handschrift")).toContain("Caveat");
    expect(fontFamilyOf("kraeftig")).toContain("Archivo");
  });
});

describe("fontSizeFactor", () => {
  it("enlarges the optically small handwriting", () => {
    expect(fontSizeFactor("handschrift")).toBeGreaterThan(1);
  });

  it("leaves every other choice untouched", () => {
    expect(fontSizeFactor("modern")).toBe(1);
    expect(fontSizeFactor(undefined)).toBe(1);
  });
});
