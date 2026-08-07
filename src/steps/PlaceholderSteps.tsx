/**
 * Interim panel for step 5 (task 04/09). The real download flow arrives with
 * task 13.
 */
import { PostPreview } from "../components/PostPreview";
import { buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

function PreviewPanel({ hint }: { hint: string }) {
  const { state } = useWizard();
  const { kit } = useBrand();
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
          input={buildRenderInput(state, template, kit)}
          ariaLabel="Vorschau deines Posts"
        />
      </div>
      <p className="step-hint">{hint}</p>
    </>
  );
}

export function DownloadStep() {
  return (
    <PreviewPanel hint="Hier kannst du dein Bild bald speichern und teilen." />
  );
}
