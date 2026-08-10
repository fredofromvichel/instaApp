/**
 * "Mein Stil" sheet (task 09): logo upload + favorite colors.
 * Opened from the start screen; everything stays on the device.
 */
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { BrandColors } from "../lib/brandPalette";
import { deriveBrandPalette } from "../lib/brandPalette";
import { useBrand } from "../state/brand";
import { PALETTES } from "../templates/palettes";

/**
 * The three color slots, in the order they matter. Each one is optional; what
 * the user leaves out is derived (brandPalette.ts), and the preview below
 * shows exactly what the result will look like.
 */
const COLOR_SLOTS: {
  key: keyof BrandColors;
  label: string;
  hint: string;
}[] = [
  {
    key: "background",
    label: "1. Hintergrund",
    hint: "Die große Fläche hinter allem.",
  },
  {
    key: "accent",
    label: "2. Flächen & Akzente",
    hint: "Preis-Schilder, Rahmen, kleine Hervorhebungen.",
  },
  {
    key: "text",
    label: "3. Schrift",
    hint: "Deine Textfarbe.",
  },
];

/** Shows what the three colors turn into — including the derived ones. */
function BrandPreview({ colors }: { colors: BrandColors }) {
  const base = PALETTES[0];
  const palette = base ? deriveBrandPalette(base, colors) : null;
  if (!palette) return null;
  const c = palette.colors;
  return (
    <div className="brand-preview" style={{ background: c.background }}>
      <div className="brand-preview-card" style={{ background: c.surface }}>
        <span style={{ color: c.text, fontWeight: 700 }}>Überschrift</span>
        <span style={{ color: c.muted, fontSize: "0.85rem" }}>
          Ein Beschreibungstext.
        </span>
        <span
          className="brand-preview-chip"
          style={{ background: c.accent, color: c.textOnAccent }}
        >
          4,50 €
        </span>
      </div>
    </div>
  );
}

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

  function setColor(key: keyof BrandColors, color: string | undefined) {
    const colors = { ...kit.colors };
    if (color) colors[key] = color;
    else delete colors[key];
    update({ ...kit, colors });
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
        <p className="field-hint">
          Du kannst eine, zwei oder alle drei Farben festlegen. Was du frei
          lässt, wählen wir passend dazu aus – lesbar bleibt es immer.
        </p>
        {COLOR_SLOTS.map((slot) => {
          const value = kit.colors[slot.key];
          // The picker must never open on black-by-default (Android showed
          // exactly that): unset slots open on the base palette's color for
          // this role, set slots on the last picked color.
          const pickerDefault =
            value ?? PALETTES[0]?.colors[slot.key] ?? "#c4633c";
          return (
            <div className="color-slot" key={slot.key}>
              <label className="swatch" style={{ background: value ?? "#fff" }}>
                {!value && <span aria-hidden="true">+</span>}
                <input
                  type="color"
                  value={pickerDefault}
                  onChange={(e) => setColor(slot.key, e.target.value)}
                  aria-label={`${slot.label} wählen`}
                />
              </label>
              <div className="color-slot-text">
                <strong>{slot.label}</strong>
                <span className="field-hint">{slot.hint}</span>
              </div>
              {value && (
                <button
                  type="button"
                  className="button-link"
                  onClick={() => setColor(slot.key, undefined)}
                >
                  Zurück&shy;setzen
                </button>
              )}
            </div>
          );
        })}
        <BrandPreview colors={kit.colors} />
        <p className="field-hint">
          Deine Farben erscheinen beim Anpassen als Farbwelt „Deine Farben“.
        </p>

        <button type="button" className="button-primary" onClick={onClose}>
          Fertig
        </button>
      </section>
    </div>
  );
}
