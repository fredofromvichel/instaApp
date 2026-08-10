/**
 * Step 5: Herunterladen (task 13). Full-resolution PNG export via the engine,
 * saved through the native share sheet where possible (lands directly in
 * photo apps), otherwise as a classic download with a German iOS hint.
 *
 * Extras: carousel templates export one PNG per swipe slide, and after saving
 * the same post can be exported in the other two formats without redoing the
 * wizard (adjustments stay clamped by the format-independent guardrails).
 */
import { useMemo, useState } from "react";
import { PostPreview } from "../components/PostPreview";
import { exportSlides } from "../engine/export";
import { templateSlides } from "../engine/types";
import { newDraftSession } from "../lib/draftStore";
import { POST_FORMATS, type PostFormat } from "../lib/formats";
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

type FormatId = PostFormat["id"];

type SaveState =
  | { phase: "idle" }
  | { phase: "working"; formatId: FormatId }
  | { phase: "done"; via: "share" | "download"; formatId: FormatId }
  | { phase: "error"; message: string };

export function DownloadStep() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const [save, setSave] = useState<SaveState>({ phase: "idle" });

  const template = state.templateId ? getTemplate(state.templateId) : undefined;
  const slides = template ? templateSlides(template) : 1;

  const fileBase = useMemo(() => {
    if (!template) return "post";
    // Prefer the headline the user typed; a value carrying only formatting
    // (no text) is not a name.
    const value = state.values.title1;
    const typed = value?.type === "text" ? value.text.trim() : "";
    const base = typed !== "" ? typed : template.name;
    const date = new Date().toISOString().slice(0, 10);
    return `${slugify(base)}-${date}`;
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
  const chosenFormatId = state.formatId;
  const otherFormats = POST_FORMATS.filter((f) => f.id !== chosenFormatId);

  const untouchedTexts = template.slots.filter((slot) => {
    if (slot.type !== "text" || slot.optional || slot.fixed) return false;
    const value = state.values[slot.id];
    return value?.type !== "text" || value.text.trim() === "";
  });

  function namesFor(formatId: FormatId): string[] {
    const formatSuffix =
      formatId === chosenFormatId
        ? ""
        : `-${slugify(POST_FORMATS.find((f) => f.id === formatId)?.label ?? formatId)}`;
    if (slides === 1) return [`${fileBase}${formatSuffix}.png`];
    return Array.from(
      { length: slides },
      (_, i) => `${fileBase}${formatSuffix}-${i + 1}.png`,
    );
  }

  async function saveImage(formatId: FormatId) {
    if (!template) return;
    setSave({ phase: "working", formatId });
    try {
      const blobs = await exportSlides(
        buildRenderInput({ ...state, formatId }, template, kit),
      );
      const names = namesFor(formatId);
      const files = blobs.map(
        (blob, i) =>
          new File([blob], names[i] ?? `${fileBase}.png`, {
            type: "image/png",
          }),
      );

      if (navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files });
          setSave({ phase: "done", via: "share", formatId });
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

      files.forEach((file, i) => {
        // Staggered so browsers don't swallow the second download.
        window.setTimeout(() => {
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }, i * 500);
      });
      setSave({ phase: "done", via: "download", formatId });
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

  const workingId = save.phase === "working" ? save.formatId : null;

  return (
    <>
      <div className="post-preview">
        <PostPreview
          input={buildRenderInput(state, template, kit)}
          ariaLabel="Vorschau deines fertigen Posts"
        />
      </div>

      {slides > 1 && save.phase !== "done" && (
        <p className="step-hint">
          Dieser Post besteht aus {slides} Bildern. Wähle beim Posten einfach
          beide aus – deine Follower wischen dann weiter. 🐾
        </p>
      )}

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
              ? slides > 1
                ? "Deine Bilder sind gespeichert. Öffne Instagram und wähle beim Erstellen deines Beitrags beide Bilder nacheinander aus."
                : "Dein Bild ist gespeichert. Öffne Instagram und wähle es beim Erstellen deines Beitrags aus."
              : slides > 1
                ? "Deine Bilder liegen jetzt in deinen Downloads. Falls du sie nicht findest: Halte ein Bild gedrückt und wähle „Bild sichern“."
                : "Dein Bild liegt jetzt in deinen Downloads. Falls du es nicht findest: Halte das Bild gedrückt und wähle „Bild sichern“."}
          </p>
          <div style={{ marginTop: 16 }}>
            <p className="field-hint" style={{ marginBottom: 8 }}>
              Gleicher Post, anderes Format?
            </p>
            <div className="button-row">
              {otherFormats.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className="button-secondary"
                  disabled={workingId !== null}
                  onClick={() => void saveImage(format.id)}
                >
                  Auch als {format.label}
                </button>
              ))}
            </div>
          </div>
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
            disabled={workingId !== null}
            onClick={() => void saveImage(chosenFormatId)}
          >
            {workingId !== null
              ? slides > 1
                ? "Bilder werden erstellt …"
                : "Bild wird erstellt …"
              : slides > 1
                ? "💾 Beide Bilder speichern"
                : "💾 Bild speichern"}
          </button>
          {save.phase === "error" && (
            <p className="step-hint" role="alert" style={{ color: "#b3402a" }}>
              {save.message}
            </p>
          )}
          <p className="field-hint" style={{ textAlign: "center" }}>
            Gespeichert wird in voller Qualität (
            {namesFor(chosenFormatId).join(", ")}
            ).
          </p>
        </>
      )}
    </>
  );
}
