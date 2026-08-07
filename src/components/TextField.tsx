/**
 * Text input for one template text slot (task 06). The input's placeholder is
 * the slot's German example; an empty input means "use the example" for
 * required slots and "hide" for optional ones (engine behavior). The engine's
 * auto-fit guarantees the layout never breaks — the counter/hint here is just
 * gentle feedback before the text gets silly-long.
 */
import { useId } from "react";
import type { TextSlot } from "../engine/types";
import { useWizard } from "../state/wizard";

export function TextField({ slot }: { slot: TextSlot }) {
  const { state, dispatch } = useWizard();
  const id = useId();
  const value = state.values[slot.id];
  const text = value?.type === "text" ? value.text : "";
  const maxChars = slot.maxChars ?? 120;
  const nearLimit = text.length >= maxChars * 0.8;

  function onChange(next: string) {
    dispatch({
      type: "setValue",
      slotId: slot.id,
      value: next === "" ? null : { type: "text", text: next },
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
    placeholder: slot.example,
    maxLength: maxChars,
    onFocus,
  };

  return (
    <div className="field">
      <label htmlFor={id}>
        {slot.label}
        {slot.optional ? " (optional)" : ""}
      </label>
      {slot.multiline ? (
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
      {nearLimit && (
        <p className="field-hint">
          {text.length >= maxChars
            ? "Maximale Länge erreicht – kürzer wirkt oft besser."
            : `${maxChars - text.length} Zeichen übrig`}
        </p>
      )}
    </div>
  );
}
