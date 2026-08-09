import { describe, expect, it } from "vitest";
import { clipboardImageFromEvent, readClipboardImage } from "./clipboard";

function pasteEvent(
  items: Array<{ kind: string; type: string; file?: Blob }>,
): ClipboardEvent {
  return {
    clipboardData: {
      items: {
        ...items.map((item) => ({
          kind: item.kind,
          type: item.type,
          getAsFile: () => item.file ?? null,
        })),
        length: items.length,
      },
    },
  } as unknown as ClipboardEvent;
}

/** Install a fake `navigator.clipboard.read` for the duration of one call. */
async function withClipboard<T>(
  read: (() => Promise<unknown>) | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: read ? { read } : {} },
  });
  try {
    return await run();
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: original,
    });
  }
}

describe("clipboardImageFromEvent", () => {
  it("returns the pasted image file", () => {
    const image = new Blob(["x"], { type: "image/png" });
    const found = clipboardImageFromEvent(
      pasteEvent([
        { kind: "string", type: "text/plain" },
        { kind: "file", type: "image/png", file: image },
      ]),
    );
    expect(found).toBe(image);
  });

  it("ignores pastes without an image", () => {
    expect(
      clipboardImageFromEvent(
        pasteEvent([{ kind: "string", type: "text/plain" }]),
      ),
    ).toBeNull();
    expect(clipboardImageFromEvent({} as ClipboardEvent)).toBeNull();
  });
});

describe("readClipboardImage", () => {
  it("returns the first image on the clipboard", async () => {
    const image = new Blob(["x"], { type: "image/jpeg" });
    const result = await withClipboard(
      async () => [
        { types: ["text/plain"], getType: async () => new Blob() },
        { types: ["image/jpeg"], getType: async () => image },
      ],
      () => readClipboardImage(),
    );
    expect(result).toBe(image);
  });

  it("returns null when the clipboard holds no image", async () => {
    const result = await withClipboard(
      async () => [{ types: ["text/plain"], getType: async () => new Blob() }],
      () => readClipboardImage(),
    );
    expect(result).toBeNull();
  });

  it("explains in German when reading is unsupported", async () => {
    await withClipboard(undefined, async () => {
      await expect(readClipboardImage()).rejects.toThrow(/Zwischenablage/);
    });
  });

  it("explains in German when the browser denies access", async () => {
    await withClipboard(
      () => Promise.reject(new Error("NotAllowedError")),
      async () => {
        await expect(readClipboardImage()).rejects.toThrow(/Zwischenablage/);
      },
    );
  });
});
