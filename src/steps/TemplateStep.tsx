/**
 * Step 3: Vorlage wählen — eight designs, each previewed with the content the
 * user just entered (SPEC.md §3). No category tabs: with eight templates a
 * single grid is faster to scan than any grouping, and the point is to compare
 * them all against the same content.
 */
import { PostPreview } from "../components/PostPreview";
import { buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { TEMPLATES } from "../templates/catalog";

export function TemplateStep() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();

  return (
    <>
      <p className="step-hint">
        Deine Texte sind schon drin – tippe dich durch und nimm, was dir am
        besten gefällt.
      </p>
      <div className="card-grid template-grid">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`select-card template-card ${
              state.templateId === template.id ? "selected" : ""
            }`}
            onClick={() =>
              dispatch({ type: "chooseTemplate", templateId: template.id })
            }
          >
            <PostPreview
              input={{
                ...buildRenderInput(state, template, kit),
                // Empty fields fall back to the template's example content, so
                // a half-filled draft still previews as a finished design.
                previewExamples: true,
              }}
              ariaLabel={`Vorlage ${template.name}`}
            />
            <span className="card-title">{template.name}</span>
            <span className="card-caption">{template.hint}</span>
          </button>
        ))}
      </div>
    </>
  );
}
