import { describe, expect, it } from "vitest";
import { deserializeState } from "./draftStore";

/** A draft as written by the version before the universal content fields. */
const legacyDraft = {
  step: "adjust" as const,
  formatId: "portrait" as const,
  templateId: "hund-steckbrief",
  paletteId: "cognac",
  values: {
    name: { type: "text" as const, text: "Bello" },
    story: { type: "text" as const, text: "Ein fröhlicher Kerl." },
    price: { type: "text" as const, text: "Seit Mai bei uns" },
  },
  adjustments: { name: { dx: 20, dy: 0, scale: 1.2 } },
};

describe("deserializeState (old drafts)", () => {
  it("moves legacy texts into the universal fields", async () => {
    const state = await deserializeState(legacyDraft);
    expect(state.values.title1).toEqual({ type: "text", text: "Bello" });
    expect(state.values.text1).toEqual({
      type: "text",
      text: "Ein fröhlicher Kerl.",
    });
    expect(state.values.title2).toEqual({
      type: "text",
      text: "Seit Mai bei uns",
    });
  });

  it("sends a draft with a retired template back to the picker", async () => {
    const state = await deserializeState(legacyDraft);
    expect(state.templateId).toBeNull();
    expect(state.step).toBe("template");
    // Placements referred to the retired template's frames.
    expect(state.adjustments).toEqual({});
  });

  it("keeps a draft that names a template we still ship", async () => {
    const state = await deserializeState({
      ...legacyDraft,
      templateId: "steckbrief",
    });
    expect(state.templateId).toBe("steckbrief");
    expect(state.step).toBe("adjust");
    expect(state.adjustments).toEqual(legacyDraft.adjustments);
  });

  it("never overwrites content that is already universal", async () => {
    const state = await deserializeState({
      ...legacyDraft,
      values: {
        ...legacyDraft.values,
        title1: { type: "text", text: "Schon neu" },
      },
    });
    expect(state.values.title1).toEqual({ type: "text", text: "Schon neu" });
  });
});
