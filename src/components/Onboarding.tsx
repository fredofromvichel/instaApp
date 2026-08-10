/**
 * First-run onboarding (task 14): one friendly sheet explaining the flow,
 * with an add-to-home-screen hint. Shown once, skippable, never again.
 */
import { useState } from "react";

const STORAGE_KEY = "insta-studio-onboarded";

export function Onboarding() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) === null,
  );
  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="sheet-backdrop">
      <section className="sheet" aria-label="Willkommen">
        <h2 style={{ margin: 0 }}>Schön, dass du da bist! 👋</h2>
        <p className="step-hint" style={{ textAlign: "left" }}>
          Mit Insta-Studio gestaltest du in drei Schritten professionelle Posts:
        </p>
        <ol className="onboarding-list">
          <li>
            <span aria-hidden="true">📷</span> Bild und Texte eingeben – alles
            ist freiwillig
          </li>
          <li>
            <span aria-hidden="true">🎨</span> Vorlage aussuchen: du siehst
            deine Texte in jedem Design
          </li>
          <li>
            <span aria-hidden="true">💾</span> Feinschliff, speichern – und bei
            Instagram posten
          </li>
        </ol>
        <p className="field-hint">
          Tipp: Füge die App deinem Startbildschirm hinzu („Teilen“ → „Zum
          Home-Bildschirm“), dann ist sie immer griffbereit – auch ohne
          Internet.
        </p>
        <button type="button" className="button-primary" onClick={dismiss}>
          Los geht's!
        </button>
      </section>
    </div>
  );
}
