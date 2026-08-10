/**
 * Step 2: Inhalte ausfüllen — before any template is chosen.
 *
 * The user types the four universal fields and picks a photo; the template
 * step then shows every design filled with exactly this content. Nothing here
 * depends on a template, which is what makes browsing designs afterwards
 * lossless (SPEC.md §3).
 */
import { ContentField } from "../components/ContentField";
import { LogoToggle } from "../components/LogoToggle";
import { PhotoField } from "../components/PhotoField";
import { QrField } from "../components/QrField";
import { CONTENT_SLOT_IDS } from "../engine/types";
import { useWizard } from "../state/wizard";

export function ContentStep() {
  const { state } = useWizard();
  if (!state.formatId) {
    return (
      <div className="empty-state">
        <p style={{ margin: 0 }}>Bitte wähle zuerst ein Format aus.</p>
      </div>
    );
  }

  return (
    <>
      <p className="step-hint">
        Schreib einfach drauflos – du musst nicht alles ausfüllen. Die Vorlage
        suchst du gleich danach aus.
      </p>

      <h2 className="form-section-title">Dein Bild</h2>
      <PhotoField />

      <h2 className="form-section-title">Deine Texte</h2>
      {CONTENT_SLOT_IDS.map((slotId) => (
        <ContentField key={slotId} slotId={slotId} />
      ))}
      <p className="step-hint">
        Bei Vorlagen mit 2 Bildern landet alles mit einer „2“ auf dem zweiten
        Bild.
      </p>

      <h2 className="form-section-title">QR-Code</h2>
      <QrField slotId="qr" />

      <LogoToggle />
    </>
  );
}
