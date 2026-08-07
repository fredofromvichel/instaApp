/**
 * Autosave (task 09): debounced write of the wizard state to IndexedDB with a
 * small preview thumbnail. Returns true while storage is failing (e.g. full)
 * so the UI can show a friendly German notice.
 */
import { useEffect, useState } from "react";
import { renderPost } from "../engine/render";
import type { WizardState } from "../state/wizard";
import { getTemplate } from "../templates/catalog";
import type { BrandKit } from "./brandStore";
import { getCurrentDraftId, saveDraft } from "./draftStore";
import { buildRenderInput } from "./renderInput";

const THUMB_WIDTH = 240;

async function makeThumbnail(
  state: WizardState,
  kit: BrandKit,
): Promise<Blob | undefined> {
  const template = state.templateId ? getTemplate(state.templateId) : undefined;
  if (!template || !state.formatId) return undefined;
  const full = document.createElement("canvas");
  await renderPost(full, buildRenderInput(state, template, kit));
  const small = document.createElement("canvas");
  small.width = THUMB_WIDTH;
  small.height = Math.round((full.height / full.width) * THUMB_WIDTH);
  const ctx = small.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(full, 0, 0, small.width, small.height);
  return new Promise((resolve) => {
    small.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.75);
  });
}

export function useAutosave(state: WizardState, kit: BrandKit): boolean {
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const hasProgress =
      state.templateId !== null || Object.keys(state.values).length > 0;
    if (!hasProgress) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const thumbnail = await makeThumbnail(state, kit);
          await saveDraft(getCurrentDraftId(), state, thumbnail);
          setStorageError(false);
        } catch {
          setStorageError(true);
        }
      })();
    }, 2000);
    return () => window.clearTimeout(handle);
  }, [state, kit]);

  return storageError;
}
