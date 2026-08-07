/**
 * Wizard state (task 04): one reducer drives the whole create-a-post flow.
 * Steps: Format → Vorlage → Inhalte → Anpassen → Herunterladen.
 * Later tasks plug into this state: photo/text editing write `values`
 * (tasks 05/06), repositioning writes `adjustments` (task 08), and
 * persistence (task 09) serializes the entire `WizardState`.
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
  "template",
  "content",
  "adjust",
  "download",
] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  format: "Format wählen",
  template: "Vorlage wählen",
  content: "Inhalte ausfüllen",
  adjust: "Anpassen",
  download: "Herunterladen",
};

export interface WizardState {
  step: StepId;
  formatId: FormatId | null;
  templateId: string | null;
  /** null = template default (first palette). */
  paletteId: string | null;
  values: Record<string, SlotValue>;
  adjustments: Record<string, SlotAdjustment>;
}

export const initialWizardState: WizardState = {
  step: "format",
  formatId: null,
  templateId: null,
  paletteId: null,
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
      // Switching templates invalidates palette + adjustments, but the
      // photo (slot id "photo" by convention) survives the switch.
      if (action.templateId === state.templateId) return state;
      return {
        ...state,
        templateId: action.templateId,
        paletteId: null,
        adjustments: {},
      };
    case "choosePalette":
      return { ...state, paletteId: action.paletteId };
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
    templateId: params.get("template") ?? "produkt-klassik",
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
