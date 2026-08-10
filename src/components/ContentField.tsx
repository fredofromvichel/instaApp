/**
 * Input for one of the four universal content fields (SPEC.md §3).
 *
 * Unlike the old per-template fields these exist before a template is chosen,
 * so the label is the same everywhere and the hint explains where the text
 * will land. Everything is optional — empty fields simply collapse.
 */
import { useId } from "react";
import {
  CONTENT_LABELS,
  CONTENT_TEXT_LIMIT,
  CONTENT_TITLE_LIMIT,
  type ContentSlotId,
} from "../engine/types";
import { useWizard } from "../state/wizard";

interface FieldSpec {
  hint: string;
  placeholder: string;
  maxChars: number;
  multiline: boolean;
}

const FIELDS: Record<ContentSlotId, FieldSpec> = {
  title1: {
    hint: "Die große Überschrift.",
    placeholder: "z. B. Frisch gebackenes Sauerteigbrot",
    maxChars: CONTENT_TITLE_LIMIT,
    multiline: false,
  },
  text1: {
    hint: "Dein Fließtext dazu.",
    placeholder: "z. B. Jeden Samstag ab 8 Uhr im Hofladen.",
    maxChars: CONTENT_TEXT_LIMIT,
    multiline: true,
  },
  title2: {
    hint: "Kurze zweite Zeile – z. B. Preis, Datum oder Name.",
    placeholder: "z. B. 4,50 €",
    maxChars: CONTENT_TITLE_LIMIT,
    multiline: false,
  },
  text2: {
    hint: "Noch ein Text, wenn du mehr zu sagen hast.",
    placeholder: "z. B. Bestellungen gern vorab per Nachricht",
    maxChars: CONTENT_TEXT_LIMIT,
    multiline: true,
  },
};

export function ContentField({ slotId }: { slotId: ContentSlotId }) {
  const { state, dispatch } = useWizard();
  const id = useId();
  const spec = FIELDS[slotId];
  const value = state.values[slotId];
  const text = value?.type === "text" ? value.text : "";

  function onChange(next: string) {
    dispatch({
      type: "setValue",
      slotId,
      // Keep any formatting the user already picked for this field.
      value:
        next === ""
          ? null
          : {
              ...(value?.type === "text" ? value : {}),
              type: "text",
              text: next,
            },
    });
  }

  function onFocus(event: React.FocusEvent<HTMLElement>) {
    // Keep the focused field visible above the on-screen keyboard.
    const target = event.target;
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 250);
  }

  const shared = {
    id,
    value: text,
    placeholder: spec.placeholder,
    maxLength: spec.maxChars,
    onFocus,
  };

  return (
    <div className="field">
      <label htmlFor={id}>{CONTENT_LABELS[slotId]}</label>
      {spec.multiline ? (
        <textarea
          {...shared}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...shared}
          type="text"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <p className="field-hint">
        {text.length >= spec.maxChars
          ? "Maximale Länge erreicht – kürzer wirkt oft besser."
          : spec.hint}
      </p>
    </div>
  );
}
