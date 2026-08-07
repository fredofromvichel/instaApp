/**
 * "Mein Stil" sheet (task 09): logo upload + favorite colors.
 * Opened from the start screen; everything stays on the device.
 */
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { MAX_BRAND_COLORS } from "../lib/brandStore";
import { useBrand } from "../state/brand";

export function BrandKitSheet({ onClose }: { onClose: () => void }) {
  const { kit, update } = useBrand();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!kit.logo) {
      setLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(kit.logo.blob);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [kit.logo]);

  async function onLogoChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      update({
        ...kit,
        logo: { blob: file, width: bitmap.width, height: bitmap.height },
      });
      bitmap.close();
      setError(null);
    } catch {
      setError(
        "Das Logo konnte nicht geladen werden. PNG oder JPG klappt am besten.",
      );
    }
  }

  function addColor(color: string) {
    if (kit.colors.includes(color) || kit.colors.length >= MAX_BRAND_COLORS)
      return;
    update({ ...kit, colors: [...kit.colors, color] });
  }

  function removeColor(color: string) {
    update({ ...kit, colors: kit.colors.filter((c) => c !== color) });
  }

  return (
    <div className="sheet-backdrop">
      <section className="sheet" aria-label="Mein Stil">
        <h2 style={{ margin: 0 }}>Mein Stil</h2>
        <p className="step-hint" style={{ textAlign: "left" }}>
          Dein Logo und deine Lieblingsfarben – einmal einstellen, in jeder
          Vorlage nutzen. Alles bleibt nur auf diesem Handy.
        </p>

        <h3 className="form-section-title">Dein Logo</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => void onLogoChosen(e)}
        />
        {logoUrl ? (
          <div className="logo-row">
            <img src={logoUrl} alt="Dein Logo" className="logo-preview" />
            <button
              type="button"
              className="button-secondary"
              onClick={() => update({ ...kit, logo: undefined })}
            >
              Entfernen
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Logo hochladen
          </button>
        )}
        {error && (
          <p className="field-hint" role="alert" style={{ color: "#b3402a" }}>
            {error}
          </p>
        )}

        <h3 className="form-section-title">Deine Farben</h3>
        <div className="swatch-row">
          {kit.colors.map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              aria-label={`Farbe ${color} entfernen`}
              title="Tippen zum Entfernen"
              onClick={() => removeColor(color)}
            >
              ×
            </button>
          ))}
          {kit.colors.length < MAX_BRAND_COLORS && (
            <label className="swatch swatch-add" title="Farbe hinzufügen">
              +
              <input
                type="color"
                onChange={(e) => addColor(e.target.value)}
                aria-label="Farbe hinzufügen"
              />
            </label>
          )}
        </div>
        <p className="field-hint">
          Tippe auf eine Farbe, um sie zu entfernen. Deine Farben erscheinen
          beim Anpassen als eigene Farbwelt.
        </p>

        <button type="button" className="button-primary" onClick={onClose}>
          Fertig
        </button>
      </section>
    </div>
  );
}
