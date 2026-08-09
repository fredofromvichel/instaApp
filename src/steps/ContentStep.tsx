/**
 * Step 3: Inhalte ausfüllen.
 * Task 05: photo picking + pan/pinch cropping directly on the live preview.
 * Task 06 adds the text inputs below the preview.
 */
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PostPreview } from "../components/PostPreview";
import { QrField } from "../components/QrField";
import { TextField } from "../components/TextField";
import { MAX_ZOOM, MIN_ZOOM } from "../engine/geometry";
import type { Frame, PhotoValue, Template, TextSlot } from "../engine/types";
import { DEFAULT_CROP } from "../engine/types";
import {
  canReadClipboardImage,
  clipboardImageFromEvent,
  readClipboardImage,
} from "../lib/clipboard";
import { panCrop, zoomCrop } from "../lib/cropGestures";
import { loadPhotoBlob } from "../lib/photo";
import { buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

/** One tap on a zoom button. */
const ZOOM_STEP = 1.15;

function photoSlotOf(template: Template) {
  return template.slots.find((slot) => slot.type === "photo");
}

interface PointerState {
  pointers: Map<number, { x: number; y: number }>;
  lastDistance: number | null;
}

/** Live preview with pan/pinch gestures controlling the photo crop. */
function PhotoCropPreview({
  template,
  slotId,
  frame,
}: {
  template: Template;
  slotId: string;
  frame: Frame;
}) {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<PointerState>({
    pointers: new Map(),
    lastDistance: null,
  });

  const photoValue = state.values[slotId];
  const hasPhoto = photoValue?.type === "photo";

  function updateCrop(update: (value: PhotoValue) => PhotoValue) {
    if (photoValue?.type !== "photo") return;
    dispatch({ type: "setValue", slotId, value: update(photoValue) });
  }

  /** CSS pixels → canvas (1080-based) pixels. */
  function canvasScale(): number {
    const canvas = wrapperRef.current?.querySelector("canvas");
    if (!canvas || canvas.clientWidth === 0) return 1;
    return canvas.width / canvas.clientWidth;
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!hasPhoto) return;
    wrapperRef.current?.setPointerCapture(event.pointerId);
    gesture.current.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    gesture.current.lastDistance = null;
  }

  function onPointerMove(event: React.PointerEvent) {
    const { pointers } = gesture.current;
    const previous = pointers.get(event.pointerId);
    if (!previous || photoValue?.type !== "photo") return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      const scale = canvasScale();
      const dx = (event.clientX - previous.x) * scale;
      const dy = (event.clientY - previous.y) * scale;
      updateCrop((value) => ({
        ...value,
        crop: panCrop(
          value.crop,
          dx,
          dy,
          value.width,
          value.height,
          frame.w,
          frame.h,
        ),
      }));
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const last = gesture.current.lastDistance;
      if (last !== null && last > 0) {
        updateCrop((value) => ({
          ...value,
          crop: zoomCrop(value.crop, distance / last),
        }));
      }
      gesture.current.lastDistance = distance;
    }
  }

  function onPointerEnd(event: React.PointerEvent) {
    gesture.current.pointers.delete(event.pointerId);
    gesture.current.lastDistance = null;
  }

  return (
    // Wrapper handles pointer events for the canvas inside PostPreview.
    <div
      ref={wrapperRef}
      className="post-preview"
      style={{ touchAction: hasPhoto ? "none" : "auto" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <PostPreview
        input={buildRenderInput(state, template, kit)}
        ariaLabel="Vorschau deines Posts"
      />
    </div>
  );
}

/**
 * Everything around the photo: picking it (gallery/camera or clipboard),
 * cropping it on the live preview, and the zoom buttons — the finger-friendly
 * alternative to a two-finger pinch, and the only obvious way to discover that
 * a photo may be made smaller than its frame.
 */
function PhotoField({
  template,
  slotId,
  frame,
}: {
  template: Template;
  slotId: string;
  frame: Frame;
}) {
  const { state, dispatch } = useWizard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const value = state.values[slotId];
  const photo = value?.type === "photo" ? value : null;
  const canPaste = canReadClipboardImage();

  const applyPhoto = useCallback(
    async (source: Blob) => {
      setPhotoError(null);
      setLoading(true);
      try {
        const loaded = await loadPhotoBlob(source);
        dispatch({
          type: "setValue",
          slotId,
          value: {
            type: "photo",
            source: loaded.source,
            width: loaded.width,
            height: loaded.height,
            crop: DEFAULT_CROP,
          },
        });
      } catch (error) {
        setPhotoError(
          error instanceof Error
            ? error.message
            : "Das hat leider nicht geklappt. Versuch es bitte noch einmal.",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch, slotId],
  );

  // Hardware keyboards (Strg/Cmd + V) and iOS's long-press "Einfügen": a
  // pasted image lands in the photo slot, pasted text is left alone.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const image = clipboardImageFromEvent(event);
      if (!image) return;
      event.preventDefault();
      void applyPhoto(image);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [applyPhoto]);

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await applyPhoto(file);
  }

  /** Must run straight from the tap — the browser asks the user first. */
  async function onPasteTapped() {
    setPhotoError(null);
    try {
      const image = await readClipboardImage();
      if (!image) {
        setPhotoError(
          "In der Zwischenablage ist gerade kein Bild. Kopiere zuerst ein Bild, z. B. in WhatsApp oder in deiner Foto-App.",
        );
        return;
      }
      await applyPhoto(image);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Das Einfügen hat leider nicht geklappt.",
      );
    }
  }

  function zoomPhoto(factor: number) {
    if (!photo) return;
    dispatch({
      type: "setValue",
      slotId,
      value: { ...photo, crop: zoomCrop(photo.crop, factor) },
    });
  }

  const pasteLabel = "📋 Bild aus Zwischenablage";
  return (
    <>
      <PhotoCropPreview template={template} slotId={slotId} frame={frame} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void onFileChosen(e)}
      />
      {!photo ? (
        <>
          <button
            type="button"
            className="button-primary"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
          >
            {loading ? "Foto wird geladen …" : "📷 Foto auswählen"}
          </button>
          {canPaste && (
            <button
              type="button"
              className="button-secondary"
              disabled={loading}
              onClick={() => void onPasteTapped()}
            >
              {pasteLabel}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="step-hint">
            Ziehe das Foto zum Verschieben. Mit den Knöpfen – oder mit zwei
            Fingern – machst du es größer und kleiner. Wird es kleiner als der
            Rahmen, füllen wir den Rand weich mit den Farben deines Fotos.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button-secondary"
              disabled={photo.crop.zoom <= MIN_ZOOM * 1.001}
              onClick={() => zoomPhoto(1 / ZOOM_STEP)}
            >
              − Kleiner
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={photo.crop.zoom >= MAX_ZOOM * 0.999}
              onClick={() => zoomPhoto(ZOOM_STEP)}
            >
              + Größer
            </button>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button-secondary"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? "Foto wird geladen …" : "Anderes Foto"}
            </button>
            {canPaste && (
              <button
                type="button"
                className="button-secondary"
                disabled={loading}
                onClick={() => void onPasteTapped()}
              >
                {pasteLabel}
              </button>
            )}
          </div>
        </>
      )}
      {photoError && (
        <p className="step-hint" role="alert" style={{ color: "#b3402a" }}>
          {photoError}
        </p>
      )}
    </>
  );
}

/** Offer the saved brand logo for the template's logo slot (task 09). */
function LogoToggle({ slotId }: { slotId: string }) {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const logoOff = state.values["logo:off"] !== undefined;
  const hasLogoValue = state.values[slotId]?.type === "image";

  // Auto-apply the saved logo unless the user switched it off.
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

export function ContentStep() {
  const { state } = useWizard();

  const template = state.templateId ? getTemplate(state.templateId) : undefined;
  if (!template || !state.formatId) {
    return (
      <div className="empty-state">
        <p style={{ margin: 0 }}>
          Bitte wähle zuerst ein Format und eine Vorlage aus.
        </p>
      </div>
    );
  }

  const photoSlot = photoSlotOf(template);
  const frame = photoSlot?.frames[state.formatId];
  const textSlots = template.slots.filter(
    (slot): slot is TextSlot => slot.type === "text" && !slot.fixed,
  );
  const qrSlot = template.slots.find((slot) => slot.type === "qr");
  const logoSlot = template.slots.find((slot) => slot.type === "logo");

  return (
    <>
      {photoSlot && frame && (
        <PhotoField template={template} slotId={photoSlot.id} frame={frame} />
      )}
      {textSlots.length > 0 && (
        <>
          <h2 className="form-section-title">Deine Texte</h2>
          {textSlots.map((slot) => (
            <TextField key={slot.id} slot={slot} />
          ))}
        </>
      )}
      {qrSlot && (
        <>
          <h2 className="form-section-title">QR-Code</h2>
          <QrField slotId={qrSlot.id} />
        </>
      )}
      {logoSlot && <LogoToggle slotId={logoSlot.id} />}
    </>
  );
}
