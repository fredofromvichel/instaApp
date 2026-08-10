/**
 * Picking the photo: gallery/camera, clipboard, or paste — plus a plain
 * preview of what was picked.
 *
 * This runs before a template exists, so there is nothing to crop against yet;
 * panning, zooming and the blurred backdrop live in "Anpassen", where the
 * photo's frame is known.
 */
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { containFit } from "../engine/geometry";
import type { PhotoValue } from "../engine/types";
import { DEFAULT_CROP } from "../engine/types";
import {
  canReadClipboardImage,
  clipboardImageFromEvent,
  readClipboardImage,
} from "../lib/clipboard";
import { loadPhotoBlob } from "../lib/photo";
import { useWizard } from "../state/wizard";

const PASTE_LABEL = "📋 Bild aus Zwischenablage";

/** Draws the picked photo into a small canvas, untouched and uncropped. */
function PhotoThumbnail({ photo }: { photo: PhotoValue }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const box = { x: 0, y: 0, w: 720, h: 480 };
    const target = containFit(photo.width, photo.height, box);
    canvas.width = Math.round(target.w);
    canvas.height = Math.round(target.h);
    ctx.drawImage(photo.source, 0, 0, canvas.width, canvas.height);
  }, [photo]);

  return (
    <canvas ref={canvasRef} className="photo-thumb" aria-label="Dein Bild" />
  );
}

export function PhotoField() {
  const { state, dispatch } = useWizard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const value = state.values.photo;
  const photo = value?.type === "photo" ? value : null;
  const canPaste = canReadClipboardImage();

  const applyPhoto = useCallback(
    async (source: Blob) => {
      setError(null);
      setLoading(true);
      try {
        const loaded = await loadPhotoBlob(source);
        dispatch({
          type: "setValue",
          slotId: "photo",
          value: {
            type: "photo",
            source: loaded.source,
            width: loaded.width,
            height: loaded.height,
            crop: DEFAULT_CROP,
          },
        });
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Das hat leider nicht geklappt. Versuch es bitte noch einmal.",
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
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
    setError(null);
    try {
      const image = await readClipboardImage();
      if (!image) {
        setError(
          "In der Zwischenablage ist gerade kein Bild. Kopiere zuerst ein Bild, z. B. in WhatsApp oder in deiner Foto-App.",
        );
        return;
      }
      await applyPhoto(image);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Das Einfügen hat leider nicht geklappt.",
      );
    }
  }

  return (
    <>
      {photo && <PhotoThumbnail photo={photo} />}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void onFileChosen(e)}
      />
      <div className="button-row">
        <button
          type="button"
          className={photo ? "button-secondary" : "button-primary"}
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading
            ? "Bild wird geladen …"
            : photo
              ? "Anderes Bild"
              : "📷 Bild auswählen"}
        </button>
        {canPaste && (
          <button
            type="button"
            className="button-secondary"
            disabled={loading}
            onClick={() => void onPasteTapped()}
          >
            {PASTE_LABEL}
          </button>
        )}
      </div>
      {photo ? (
        <button
          type="button"
          className="button-link"
          onClick={() =>
            dispatch({ type: "setValue", slotId: "photo", value: null })
          }
        >
          Bild entfernen
        </button>
      ) : (
        <p className="field-hint">
          Ohne Bild geht es auch – dafür gibt es reine Text-Vorlagen.
        </p>
      )}
      {error && (
        <p className="step-hint" role="alert" style={{ color: "#b3402a" }}>
          {error}
        </p>
      )}
    </>
  );
}
