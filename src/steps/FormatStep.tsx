/** Step 1: Format wählen — visual cards previewing the aspect ratio.
 *  Also the app's home: saved drafts and the "Mein Stil" brand kit live here. */
import { useState } from "react";
import { BrandKitSheet } from "../components/BrandKitSheet";
import { DraftList } from "../components/DraftList";
import { POST_FORMATS } from "../lib/formats";
import { useWizard } from "../state/wizard";

export function FormatStep() {
  const { state, dispatch } = useWizard();
  const [brandOpen, setBrandOpen] = useState(false);

  return (
    <>
      <p className="step-hint">Welche Form soll dein Post haben?</p>
      <div className="card-grid format-grid">
        {POST_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            className={`select-card ${state.formatId === format.id ? "selected" : ""}`}
            onClick={() =>
              dispatch({ type: "chooseFormat", formatId: format.id })
            }
          >
            <span
              className="format-shape"
              style={{ height: 56 * (format.height / format.width) }}
            />
            <span className="card-title">{format.label}</span>
            <span className="card-caption">
              {format.id === "square" && "Klassischer Beitrag"}
              {format.id === "portrait" && "Großer Beitrag"}
              {format.id === "story" && "Ganzer Bildschirm"}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="button-secondary"
        onClick={() => setBrandOpen(true)}
      >
        🎨 Mein Stil (Logo & Farben)
      </button>
      <DraftList />
      {brandOpen && <BrandKitSheet onClose={() => setBrandOpen(false)} />}
    </>
  );
}
