/** Step 2: Vorlage wählen — category tabs + preview grid with live thumbnails. */
import { useState } from "react";
import { PostPreview } from "../components/PostPreview";
import type { TemplateCategory } from "../engine/types";
import { useWizard } from "../state/wizard";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  templatesByCategory,
} from "../templates/catalog";

export function TemplateStep() {
  const { state, dispatch } = useWizard();
  const [category, setCategory] = useState<TemplateCategory>(() => {
    if (import.meta.env.DEV) {
      const param = new URLSearchParams(window.location.search).get("category");
      if (param === "quotes" || param === "dogs" || param === "team")
        return param;
    }
    return "products";
  });
  const templates = templatesByCategory(category);
  const formatId = state.formatId ?? "square";

  return (
    <>
      <p className="step-hint">
        Such dir eine Vorlage aus – anpassen kannst du gleich alles.
      </p>
      <div className="chip-row" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            className={`chip ${c === category ? "selected" : ""}`}
            onClick={() => setCategory(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      {templates.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0, fontWeight: 600 }}>Hier kommt bald etwas!</p>
          <p style={{ margin: "8px 0 0" }}>
            Vorlagen für „{CATEGORY_LABELS[category]}“ sind schon in Arbeit.
          </p>
        </div>
      ) : (
        <div className="card-grid template-grid">
          {templates.map((template) => (
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
                  template,
                  formatId,
                  values: {},
                  previewExamples: true,
                }}
                ariaLabel={`Vorlage ${template.name}`}
              />
              <span className="card-title">{template.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
