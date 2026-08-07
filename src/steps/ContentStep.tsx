/**
 * Step 3: Inhalte ausfüllen.
 * Task 05: photo picking + pan/pinch cropping directly on the live preview.
 * Task 06 adds the text inputs below the preview.
 */
import { type ChangeEvent, useRef, useState } from "react";
import { PostPreview } from "../components/PostPreview";
import { QrField } from "../components/QrField";
import { TextField } from "../components/TextField";
import type { Frame, PhotoValue, Template } from "../engine/types";
import { DEFAULT_CROP } from "../engine/types";
import { panCrop, pinchCrop } from "../lib/cropGestures";
import { loadPhotoFile } from "../lib/photo";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

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
  frame,
}: {
  template: Template;
  frame: Frame;
}) {
  const { state, dispatch } = useWizard();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<PointerState>({
    pointers: new Map(),
    lastDistance: null,
  });

  const photoValue = state.values.photo;
  const hasPhoto = photoValue?.type === "photo";

  function updateCrop(update: (value: PhotoValue) => PhotoValue) {
    if (photoValue?.type !== "photo") return;
    dispatch({ type: "setValue", slotId: "photo", value: update(photoValue) });
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
          crop: pinchCrop(value.crop, distance / last),
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
        input={{
          template,
          formatId: state.formatId ?? "square",
          paletteId: state.paletteId ?? undefined,
          values: state.values,
          adjustments: state.adjustments,
        }}
        ariaLabel="Vorschau deines Posts"
      />
    </div>
  );
}

export function ContentStep() {
  const { state, dispatch } = useWizard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  const hasPhoto = state.values.photo?.type === "photo";
  const textSlots = template.slots.filter((slot) => slot.type === "text");
  const qrSlot = template.slots.find((slot) => slot.type === "qr");

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setLoading(true);
    try {
      const photo = await loadPhotoFile(file);
      dispatch({
        type: "setValue",
        slotId: "photo",
        value: {
          type: "photo",
          source: photo.source,
          width: photo.width,
          height: photo.height,
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
  }

  return (
    <>
      {photoSlot && frame && (
        <PhotoCropPreview template={template} frame={frame} />
      )}
      {photoSlot && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onFileChosen(e)}
          />
          {!hasPhoto ? (
            <button
              type="button"
              className="button-primary"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? "Foto wird geladen …" : "📷 Foto auswählen"}
            </button>
          ) : (
            <>
              <p className="step-hint">
                Ziehe das Foto zum Verschieben – mit zwei Fingern zoomst du.
              </p>
              <button
                type="button"
                className="button-secondary"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? "Foto wird geladen …" : "Anderes Foto wählen"}
              </button>
            </>
          )}
          {photoError && (
            <p className="step-hint" role="alert" style={{ color: "#b3402a" }}>
              {photoError}
            </p>
          )}
        </>
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
    </>
  );
}
