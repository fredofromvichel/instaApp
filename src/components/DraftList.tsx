/**
 * Saved drafts on the start screen (task 09): thumbnail, date, reopen, delete.
 */
import { useEffect, useState } from "react";
import {
  deleteDraft,
  deserializeState,
  listDrafts,
  type StoredDraft,
  setCurrentDraftId,
} from "../lib/draftStore";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function DraftThumb({ draft }: { draft: StoredDraft }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!draft.thumbnail) return;
    const objectUrl = URL.createObjectURL(draft.thumbnail);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [draft.thumbnail]);
  return url ? (
    <img src={url} alt="" className="draft-thumb" />
  ) : (
    <span className="draft-thumb draft-thumb-empty" />
  );
}

export function DraftList() {
  const { dispatch } = useWizard();
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
  }, []);

  if (drafts.length === 0) return null;

  async function openDraft(draft: StoredDraft) {
    try {
      const state = await deserializeState(draft.state);
      setCurrentDraftId(draft.id);
      dispatch({ type: "restore", state });
    } catch {
      setError("Der Entwurf konnte leider nicht geöffnet werden.");
    }
  }

  async function removeDraft(id: string) {
    await deleteDraft(id).catch(() => undefined);
    setDrafts((current) => current.filter((d) => d.id !== id));
  }

  return (
    <section>
      <h2 className="form-section-title">Deine Entwürfe</h2>
      <p className="field-hint">
        Bleiben nur auf diesem Handy gespeichert – die neuesten 10 werden
        behalten.
      </p>
      {error && (
        <p className="field-hint" role="alert" style={{ color: "#b3402a" }}>
          {error}
        </p>
      )}
      <div className="draft-list">
        {drafts.map((draft) => {
          const template = draft.state.templateId
            ? getTemplate(draft.state.templateId)
            : undefined;
          return (
            <div key={draft.id} className="draft-row">
              <button
                type="button"
                className="draft-open"
                onClick={() => void openDraft(draft)}
              >
                <DraftThumb draft={draft} />
                <span className="draft-meta">
                  <strong>{template?.name ?? "Neuer Post"}</strong>
                  <span className="field-hint">
                    {formatDate(draft.updatedAt)} Uhr
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="draft-delete"
                aria-label="Entwurf löschen"
                onClick={() => void removeDraft(draft.id)}
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
