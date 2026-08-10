/**
 * Wizard state: one reducer drives the whole create-a-post flow.
 * Steps: Format → Inhalte → Vorlage → Anpassen → Herunterladen.
 *
 * Content comes *before* the template on purpose (SPEC.md §3): the user fills
 * the four universal fields once and then flips through the designs with her
 * own words and photo in them. Everything the user owns therefore lives in
 * `values`, keyed by universal slot ids that all templates share.
 */
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useReducer,
} from "react";
import type { FormatId, SlotAdjustment, SlotValue } from "../engine/types";

export const STEPS = [
  "format",
  "content",
  "template",
  "adjust",
  "download",
] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  format: "Format wählen",
  content: "Inhalte ausfüllen",
  template: "Vorlage wählen",
  adjust: "Anpassen",
  download: "Herunterladen",
};

export interface WizardState {
  step: StepId;
  formatId: FormatId | null;
  templateId: string | null;
  /** null = template default (first palette). */
  paletteId: string | null;
  /** null = template default (first style variant). */
  variantId: string | null;
  values: Record<string, SlotValue>;
  adjustments: Record<string, SlotAdjustment>;
}

export const initialWizardState: WizardState = {
  step: "format",
  formatId: null,
  templateId: null,
  paletteId: null,
  variantId: null,
  values: {},
  adjustments: {},
};

export type WizardAction =
  | { type: "goToStep"; step: StepId }
  | { type: "next" }
  | { type: "back" }
  | { type: "chooseFormat"; formatId: FormatId }
  | { type: "chooseTemplate"; templateId: string }
  | { type: "choosePalette"; paletteId: string }
  | { type: "chooseVariant"; variantId: string }
  | { type: "setValue"; slotId: string; value: SlotValue | null }
  | { type: "setAdjustment"; slotId: string; adjustment: SlotAdjustment | null }
  | {
      type: "setAllAdjustments";
      adjustments: Record<string, SlotAdjustment>;
    }
  | { type: "restart" }
  | { type: "restore"; state: WizardState };

function shift(step: StepId, offset: number): StepId {
  const index = STEPS.indexOf(step) + offset;
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, index))] ?? step;
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case "goToStep":
      return { ...state, step: action.step };
    case "next":
      return { ...state, step: shift(state.step, 1) };
    case "back":
      return { ...state, step: shift(state.step, -1) };
    case "chooseFormat":
      return { ...state, formatId: action.formatId };
    case "chooseTemplate":
      // All content survives a template switch — that is the whole point of
      // the universal fields. The palette does too (one shared set). Only the
      // style variant and the placements are template-specific.
      if (action.templateId === state.templateId) return state;
      return {
        ...state,
        templateId: action.templateId,
        variantId: null,
        adjustments: {},
      };
    case "choosePalette":
      return { ...state, paletteId: action.paletteId };
    case "chooseVariant":
      return { ...state, variantId: action.variantId };
    case "setValue": {
      const values = { ...state.values };
      if (action.value === null) delete values[action.slotId];
      else values[action.slotId] = action.value;
      return { ...state, values };
    }
    case "setAdjustment": {
      const adjustments = { ...state.adjustments };
      if (action.adjustment === null) delete adjustments[action.slotId];
      else adjustments[action.slotId] = action.adjustment;
      return { ...state, adjustments };
    }
    case "setAllAdjustments":
      return { ...state, adjustments: action.adjustments };
    case "restart":
      return initialWizardState;
    case "restore":
      return action.state;
    default:
      return state;
  }
}

const WizardContext = createContext<{
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
} | null>(null);

/** Dev-only deep link (e.g. ?step=template&format=portrait) for screenshots
 *  and manual testing — ignored in production builds. */
function initState(defaultState: WizardState): WizardState {
  if (!import.meta.env.DEV) return defaultState;
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  if (!step || !STEPS.includes(step as StepId)) return defaultState;
  const format = params.get("format");
  return {
    ...defaultState,
    step: step as StepId,
    formatId:
      format === "square" || format === "portrait" || format === "story"
        ? format
        : "square",
    templateId: params.get("template") ?? "klassik",
  };
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    wizardReducer,
    initialWizardState,
    initState,
  );
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error("useWizard außerhalb des WizardProvider");
  return context;
}
