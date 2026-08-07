/**
 * Wizard shell (task 04): header with back navigation + progress dots,
 * the current step, and the bottom action bar (one primary action).
 */
import "./app.css";
import { useAutosave } from "./lib/useAutosave";
import { BrandProvider, useBrand } from "./state/brand";
import { STEP_TITLES, STEPS, useWizard, WizardProvider } from "./state/wizard";
import { AdjustStep } from "./steps/AdjustStep";
import { ContentStep } from "./steps/ContentStep";
import { FormatStep } from "./steps/FormatStep";
import { DownloadStep } from "./steps/PlaceholderSteps";
import { TemplateStep } from "./steps/TemplateStep";

function stepContent(step: (typeof STEPS)[number]) {
  switch (step) {
    case "format":
      return <FormatStep />;
    case "template":
      return <TemplateStep />;
    case "content":
      return <ContentStep />;
    case "adjust":
      return <AdjustStep />;
    case "download":
      return <DownloadStep />;
  }
}

function Wizard() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const storageError = useAutosave(state, kit);
  const stepIndex = STEPS.indexOf(state.step);

  const canContinue =
    state.step === "format"
      ? state.formatId !== null
      : state.step === "template"
        ? state.templateId !== null
        : state.step !== "download";

  return (
    <div className="app">
      <header className="wizard-header">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="back-button"
            aria-label="Zurück"
            onClick={() => dispatch({ type: "back" })}
          >
            ‹
          </button>
        ) : (
          <span />
        )}
        <h1>{STEP_TITLES[state.step]}</h1>
        <span />
      </header>
      <div className="progress-dots" aria-hidden="true">
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={
              i === stepIndex ? "current" : i < stepIndex ? "done" : ""
            }
          />
        ))}
      </div>
      <main className="step-main">
        {storageError && (
          <p className="field-hint" role="alert" style={{ color: "#b3402a" }}>
            Der Speicher deines Handys ist voll – dein Entwurf kann gerade nicht
            gesichert werden. Lösche alte Entwürfe oder Fotos.
          </p>
        )}
        {stepContent(state.step)}
      </main>
      {state.step !== "download" && (
        <div className="bottom-bar">
          <button
            type="button"
            className="button-primary"
            disabled={!canContinue}
            onClick={() => dispatch({ type: "next" })}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <BrandProvider>
      <WizardProvider>
        <Wizard />
      </WizardProvider>
    </BrandProvider>
  );
}
