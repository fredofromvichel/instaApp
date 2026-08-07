import { describe, expect, it } from "vitest";
import { getFormat, POST_FORMATS } from "./formats";

describe("POST_FORMATS", () => {
  it("provides the three Instagram formats at exact resolutions", () => {
    expect(POST_FORMATS).toHaveLength(3);
    expect(getFormat("square")).toMatchObject({ width: 1080, height: 1080 });
    expect(getFormat("portrait")).toMatchObject({ width: 1080, height: 1350 });
    expect(getFormat("story")).toMatchObject({ width: 1080, height: 1920 });
  });

  it("has German labels for every format", () => {
    for (const format of POST_FORMATS) {
      expect(format.label.length).toBeGreaterThan(0);
    }
  });
});
