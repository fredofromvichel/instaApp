/**
 * Offers the logo saved in the brand kit for the template's logo slot.
 * Auto-applied unless the user switched it off (remembered as "logo:off").
 */
import { useEffect } from "react";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";

export function LogoToggle({ slotId = "logo" }: { slotId?: string }) {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const logoOff = state.values["logo:off"] !== undefined;
  const hasLogoValue = state.values[slotId]?.type === "image";

  useEffect(() => {
    if (!kit.logo || hasLogoValue || logoOff) return;
    let cancelled = false;
    createImageBitmap(kit.logo.blob)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        dispatch({
          type: "setValue",
          slotId,
          value: {
            type: "image",
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
          },
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kit.logo, hasLogoValue, logoOff, slotId, dispatch]);

  if (!kit.logo) return null;
  return (
    <label className="toggle-row">
      <input
        type="checkbox"
        checked={hasLogoValue}
        onChange={(e) => {
          if (e.target.checked) {
            dispatch({ type: "setValue", slotId: "logo:off", value: null });
          } else {
            dispatch({ type: "setValue", slotId, value: null });
            dispatch({
              type: "setValue",
              slotId: "logo:off",
              value: { type: "text", text: "1" },
            });
          }
        }}
      />
      Dein Logo zeigen
    </label>
  );
}
