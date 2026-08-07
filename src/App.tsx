/**
 * Wizard shell (task 04): header with back navigation + progress dots,
 * the current step, and the bottom action bar (one primary action).
 */
import "./app.css";
import { useEffect } from "react";
import { Onboarding } from "./components/Onboarding";
import {
  deserializeState,
  listDrafts,
  setCurrentDraftId,
} from "./lib/draftStore";
import { useAutosave } from "./lib/useAutosave";
import { BrandProvider, useBrand } from "./state/brand";
import { STEP_TITLES, STEPS, useWizard, WizardProvider } from "./state/wizard";
import { AdjustStep } from "./steps/AdjustStep";
import { ContentStep } from "./steps/ContentStep";
import { DownloadStep } from "./steps/DownloadStep";
import { FormatStep } from "./steps/FormatStep";
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

  // A reload mid-flow resumes the draft this browser session worked on.
  useEffect(() => {
    const sessionDraftId = sessionStorage.getItem("insta-studio-session-draft");
    if (!sessionDraftId) return;
    void listDrafts()
      .then(async (drafts) => {
        const draft = drafts.find((d) => d.id === sessionDraftId);
        if (!draft) return;
        const restored = await deserializeState(draft.state);
        setCurrentDraftId(draft.id);
        dispatch({ type: "restore", state: restored });
      })
      .catch(() => undefined);
    // Mount-only: restore exactly once per page load.
  }, [dispatch]);

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
      <main className="step-main step-enter" key={state.step}>
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
        <Onboarding />
      </WizardProvider>
    </BrandProvider>
  );
}
