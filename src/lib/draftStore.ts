/**
 * Draft persistence (task 09): serialize the wizard state (incl. photo/QR/logo
 * images as blobs) into IndexedDB and back. Autosave keeps exactly one draft
 * per session id; the list is capped to the newest MAX_DRAFTS.
 */
import type { SlotAdjustment, SlotValue } from "../engine/types";
import type { WizardState } from "../state/wizard";
import { STEPS } from "../state/wizard";
import { idbDelete, idbGet, idbGetAll, idbPut } from "./db";

export const MAX_DRAFTS = 10;

/** The draft id autosave writes to. One id per editing session. */
let currentDraftId: string | null = null;

export function getCurrentDraftId(): string {
  if (!currentDraftId) currentDraftId = crypto.randomUUID();
  return currentDraftId;
}

export function setCurrentDraftId(id: string): void {
  currentDraftId = id;
}

/** Start a fresh draft session (e.g. "Neuer Post"). */
export function newDraftSession(): void {
  currentDraftId = null;
}

type StoredValue =
  | { type: "text"; text: string }
  | {
      type: "photo";
      blob: Blob;
      width: number;
      height: number;
      crop: { zoom: number; offsetX: number; offsetY: number };
    }
  | { type: "image"; blob: Blob; width: number; height: number };

interface StoredState {
  step: WizardState["step"];
  formatId: WizardState["formatId"];
  templateId: string | null;
  paletteId: string | null;
  values: Record<string, StoredValue>;
  adjustments: Record<string, SlotAdjustment>;
}

export interface StoredDraft {
  id: string;
  updatedAt: number;
  state: StoredState;
  thumbnail?: Blob;
}

function sourceToBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  type: string,
  quality?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas nicht verfügbar"));
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Speichern fehlgeschlagen")),
      type,
      quality,
    );
  });
}

async function serializeValue(value: SlotValue): Promise<StoredValue> {
  if (value.type === "text") return value;
  if (value.type === "photo") {
    return {
      type: "photo",
      blob: await sourceToBlob(
        value.source,
        value.width,
        value.height,
        "image/jpeg",
        0.9,
      ),
      width: value.width,
      height: value.height,
      crop: value.crop,
    };
  }
  return {
    type: "image",
    // PNG keeps QR modules sharp and logo transparency intact.
    blob: await sourceToBlob(
      value.source,
      value.width,
      value.height,
      "image/png",
    ),
    width: value.width,
    height: value.height,
  };
}

async function deserializeValue(stored: StoredValue): Promise<SlotValue> {
  if (stored.type === "text") return stored;
  const bitmap = await createImageBitmap(stored.blob);
  if (stored.type === "photo") {
    return {
      type: "photo",
      source: bitmap,
      width: stored.width,
      height: stored.height,
      crop: stored.crop,
    };
  }
  return {
    type: "image",
    source: bitmap,
    width: stored.width,
    height: stored.height,
  };
}

export async function serializeState(state: WizardState): Promise<StoredState> {
  const values: Record<string, StoredValue> = {};
  for (const [slotId, value] of Object.entries(state.values)) {
    values[slotId] = await serializeValue(value);
  }
  return {
    step: state.step,
    formatId: state.formatId,
    templateId: state.templateId,
    paletteId: state.paletteId,
    values,
    adjustments: state.adjustments,
  };
}

export async function deserializeState(
  stored: StoredState,
): Promise<WizardState> {
  const values: WizardState["values"] = {};
  for (const [slotId, value] of Object.entries(stored.values)) {
    values[slotId] = await deserializeValue(value);
  }
  return {
    step: STEPS.includes(stored.step) ? stored.step : "format",
    formatId: stored.formatId,
    templateId: stored.templateId,
    paletteId: stored.paletteId,
    values,
    adjustments: stored.adjustments ?? {},
  };
}

export async function saveDraft(
  id: string,
  state: WizardState,
  thumbnail?: Blob,
): Promise<void> {
  const draft: StoredDraft = {
    id,
    updatedAt: Date.now(),
    state: await serializeState(state),
    thumbnail,
  };
  await idbPut("drafts", draft);
  await pruneDrafts();
}

export async function listDrafts(): Promise<StoredDraft[]> {
  const drafts = await idbGetAll<StoredDraft>("drafts");
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDraft(id: string): Promise<void> {
  await idbDelete("drafts", id);
}

/**
 * Store a copy of a draft under a new id (blobs are structured-cloned by
 * IndexedDB) so the original stays untouched while the copy is edited.
 */
export async function duplicateDraft(
  id: string,
): Promise<StoredDraft | undefined> {
  const original = await idbGet<StoredDraft>("drafts", id);
  if (!original) return undefined;
  const copy: StoredDraft = {
    ...original,
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
  };
  await idbPut("drafts", copy);
  await pruneDrafts();
  return copy;
}

/** Keep only the newest MAX_DRAFTS drafts. */
export async function pruneDrafts(): Promise<void> {
  const drafts = await listDrafts();
  for (const stale of drafts.slice(MAX_DRAFTS)) {
    await idbDelete("drafts", stale.id);
  }
}
