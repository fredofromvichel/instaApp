/**
 * Reading images from the clipboard ("Aus Zwischenablage einfügen").
 *
 * Two paths, because phones and desktops differ:
 *  - `navigator.clipboard.read()` on a button tap. Chrome/Android and iOS
 *    Safari both support it; both ask the user for permission first, which is
 *    why it may only be called straight from a user gesture.
 *  - the classic `paste` event, for hardware keyboards (Strg/Cmd + V) and
 *    iOS's long-press "Einfügen".
 *
 * Errors are thrown as German, user-facing messages (like `photo.ts`).
 */

const IMAGE_TYPE = /^image\//;

/** Can this browser read the clipboard when asked? */
export function canReadClipboardImage(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.read === "function"
  );
}

/**
 * Read the first image on the clipboard. Resolves to `null` when the
 * clipboard holds no image at all; throws when reading is unsupported or the
 * user/browser denied it.
 */
export async function readClipboardImage(): Promise<Blob | null> {
  if (!canReadClipboardImage()) {
    throw new Error(
      "Dieser Browser kann die Zwischenablage nicht lesen. Nimm bitte „Foto auswählen“.",
    );
  }
  let items: Awaited<ReturnType<Clipboard["read"]>>;
  try {
    items = await navigator.clipboard.read();
  } catch {
    throw new Error(
      "Wir durften die Zwischenablage nicht lesen. Erlaube das Einfügen – oder nimm „Foto auswählen“.",
    );
  }
  for (const item of items) {
    const type = item.types.find((candidate) => IMAGE_TYPE.test(candidate));
    if (type) {
      try {
        return await item.getType(type);
      } catch {
        throw new Error(
          "Das Bild aus der Zwischenablage konnte nicht gelesen werden.",
        );
      }
    }
  }
  return null;
}

/** The first image attached to a paste event, if the paste carries one. */
export function clipboardImageFromEvent(event: ClipboardEvent): Blob | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.kind === "file" && IMAGE_TYPE.test(item.type)) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
