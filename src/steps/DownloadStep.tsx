/**
 * Step 5: Herunterladen (task 13). Full-resolution PNG export via the engine,
 * saved through the native share sheet where possible (lands directly in
 * photo apps), otherwise as a classic download with a German iOS hint.
 */
import { useMemo, useState } from "react";
import { PostPreview } from "../components/PostPreview";
import { exportPng } from "../engine/export";
import { newDraftSession } from "../lib/draftStore";
import { buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "post"
  );
}

type SaveState =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; via: "share" | "download" }
  | { phase: "error"; message: string };

export function DownloadStep() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const [save, setSave] = useState<SaveState>({ phase: "idle" });

  const template = state.templateId ? getTemplate(state.templateId) : undefined;

  const fileName = useMemo(() => {
    if (!template) return "post.png";
    // Prefer the first user-entered text (e.g. dog name/headline) for the name.
    const firstText = template.slots.find(
      (slot) => slot.type === "text" && state.values[slot.id]?.type === "text",
    );
    const value = firstText ? state.values[firstText.id] : undefined;
    const base = value?.type === "text" ? value.text : template.name;
    const date = new Date().toISOString().slice(0, 10);
    return `${slugify(base)}-${date}.png`;
  }, [template, state.values]);

  if (!template || !state.formatId) {
    return (
      <div className="empty-state">
        <p style={{ margin: 0 }}>
          Bitte wähle zuerst ein Format und eine Vorlage aus.
        </p>
      </div>
    );
  }

  const untouchedTexts = template.slots.filter(
    (slot) =>
      slot.type === "text" &&
      !slot.optional &&
      state.values[slot.id]?.type !== "text",
  );

  async function saveImage() {
    if (!template) return;
    setSave({ phase: "working" });
    try {
      const blob = await exportPng(buildRenderInput(state, template, kit));
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          setSave({ phase: "done", via: "share" });
          return;
        } catch (error) {
          // She closed the share sheet — that's not an error.
          if (error instanceof Error && error.name === "AbortError") {
            setSave({ phase: "idle" });
            return;
          }
          // Fall through to classic download.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setSave({ phase: "done", via: "download" });
    } catch {
      setSave({
        phase: "error",
        message:
          "Das Speichern hat leider nicht geklappt. Versuch es bitte noch einmal.",
      });
    }
  }

  function startNewPost() {
    newDraftSession();
    dispatch({ type: "restart" });
  }

  return (
    <>
      <div className="post-preview">
        <PostPreview
          input={buildRenderInput(state, template, kit)}
          ariaLabel="Vorschau deines fertigen Posts"
        />
      </div>

      {untouchedTexts.length > 0 && save.phase !== "done" && (
        <p className="step-hint">
          Kleiner Tipp:{" "}
          {untouchedTexts.length === 1
            ? "Ein Feld zeigt"
            : "Einige Felder zeigen"}{" "}
          noch Beispieltext. Gehe zurück zu „Inhalte“, wenn du das ändern
          möchtest.
        </p>
      )}

      {save.phase === "done" ? (
        <div className="empty-state" role="status">
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>
            Geschafft! 🎉
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {save.via === "share"
              ? "Dein Bild ist gespeichert. Öffne Instagram und wähle es beim Erstellen deines Beitrags aus."
              : "Dein Bild liegt jetzt in deinen Downloads. Falls du es nicht findest: Halte das Bild gedrückt und wähle „Bild sichern“."}
          </p>
          <button
            type="button"
            className="button-primary"
            style={{ marginTop: 16 }}
            onClick={startNewPost}
          >
            Neuen Post gestalten
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="button-primary"
            disabled={save.phase === "working"}
            onClick={() => void saveImage()}
          >
            {save.phase === "working"
              ? "Bild wird erstellt …"
              : "💾 Bild speichern"}
          </button>
          {save.phase === "error" && (
            <p className="step-hint" role="alert" style={{ color: "#b3402a" }}>
              {save.message}
            </p>
          )}
          <p className="field-hint" style={{ textAlign: "center" }}>
            Gespeichert wird in voller Qualität ({fileName}).
          </p>
        </>
      )}
    </>
  );
}
