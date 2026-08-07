/**
 * Interim panels for steps 3–5 (task 04). They already show the live preview
 * so the flow feels real; the actual editing arrives with tasks 05/06
 * (Inhalte), 08 (Anpassen), and 13 (Herunterladen).
 */
import { PostPreview } from "../components/PostPreview";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

function PreviewPanel({ hint }: { hint: string }) {
  const { state } = useWizard();
  const template = state.templateId ? getTemplate(state.templateId) : undefined;
  if (!template || !state.formatId) {
    return (
      <div className="empty-state">
        <p style={{ margin: 0 }}>
          Bitte wähle zuerst ein Format und eine Vorlage aus.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="post-preview">
        <PostPreview
          input={{
            template,
            formatId: state.formatId,
            paletteId: state.paletteId ?? undefined,
            values: state.values,
            adjustments: state.adjustments,
          }}
          ariaLabel="Vorschau deines Posts"
        />
      </div>
      <p className="step-hint">{hint}</p>
    </>
  );
}

export function AdjustStep() {
  return (
    <PreviewPanel hint="Hier kannst du bald Farben wechseln und Elemente verschieben." />
  );
}

export function DownloadStep() {
  return (
    <PreviewPanel hint="Hier kannst du dein Bild bald speichern und teilen." />
  );
}
