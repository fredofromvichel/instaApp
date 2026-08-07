/**
 * QR link input (task 07): paste a URL → QR code appears in the template's
 * QR slot. The raw input is kept under the companion key "<slotId>:url" so
 * the field survives navigation; the generated image lives under the slot id.
 */
import { useEffect, useId, useRef, useState } from "react";
import { generateQrCanvas, normalizeUrl } from "../lib/qr";
import { useWizard } from "../state/wizard";

export function QrField({ slotId }: { slotId: string }) {
  const { state, dispatch } = useWizard();
  const id = useId();
  const urlValue = state.values[`${slotId}:url`];
  const text = urlValue?.type === "text" ? urlValue.text : "";
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<number>(undefined);

  // Generate (debounced) whenever the entered link changes.
  useEffect(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      if (text.trim() === "") {
        setError(null);
        dispatch({ type: "setValue", slotId, value: null });
        return;
      }
      const url = normalizeUrl(text);
      if (!url) {
        setError(
          "Das sieht noch nicht wie ein Link aus – z. B. www.tierheim.de",
        );
        dispatch({ type: "setValue", slotId, value: null });
        return;
      }
      try {
        const canvas = await generateQrCanvas(url);
        setError(null);
        dispatch({
          type: "setValue",
          slotId,
          value: {
            type: "image",
            source: canvas,
            width: canvas.width,
            height: canvas.height,
          },
        });
      } catch {
        setError("Der QR-Code konnte nicht erstellt werden.");
      }
    }, 400);
    return () => window.clearTimeout(debounce.current);
  }, [text, slotId, dispatch]);

  return (
    <div className="field">
      <label htmlFor={id}>Link für QR-Code (optional)</label>
      <input
        id={id}
        type="url"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="www.deine-seite.de"
        value={text}
        onChange={(e) =>
          dispatch({
            type: "setValue",
            slotId: `${slotId}:url`,
            value:
              e.target.value === ""
                ? null
                : { type: "text", text: e.target.value },
          })
        }
      />
      {error ? (
        <p className="field-hint" role="alert" style={{ color: "#b3402a" }}>
          {error}
        </p>
      ) : (
        <p className="field-hint">
          Wer den Code mit der Handykamera scannt, landet auf deiner Seite.
        </p>
      )}
    </div>
  );
}
