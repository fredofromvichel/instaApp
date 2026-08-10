/**
 * Step 4: Anpassen.
 *
 * - Farben / Stil: curated palettes and the template's style variants.
 * - Feinschliff: tap an element → drag it anywhere, pinch (or the buttons) to
 *   resize. Placement is free; `clampAdjustment` only guarantees that nothing
 *   can be lost off-canvas (SPEC.md §4).
 * - Text: bold, italic and a choice of four fonts, per field.
 * - Photo: switch between moving its frame and choosing the visible crop.
 * - Extra fields: text slots a template adds on top of the four universal ones
 *   (the Steckbrief's Alter/Rasse/…).
 */
import { useRef, useState } from "react";
import { PostPreview } from "../components/PostPreview";
import { TextField } from "../components/TextField";
import { FONT_OPTIONS } from "../engine/fonts";
import { clampAdjustment } from "../engine/geometry";
import { canvasBounds, effectiveFrame } from "../engine/render";
import type {
  FontChoice,
  PhotoValue,
  SlotAdjustment,
  Template,
  TextSlot,
  TextValue,
} from "../engine/types";
import {
  IDENTITY_ADJUSTMENT,
  isContentSlot,
  LOCKED,
  templateSlides,
} from "../engine/types";
import { panCrop, zoomCrop } from "../lib/cropGestures";
import { getFormat } from "../lib/formats";
import { findAdjustableSlotAt } from "../lib/hitTest";
import { brandPalettesFor, buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

/** One tap on a size button. */
const SIZE_STEP = 1.12;

interface GestureState {
  pointers: Map<number, { x: number; y: number }>;
  lastDistance: number | null;
  moved: boolean;
  historyPushed: boolean;
}

/** What a drag on the selected photo does. */
type PhotoMode = "frame" | "crop";

function VariantChips({ template }: { template: Template }) {
  const { state, dispatch } = useWizard();
  const variants = template.variants ?? [];
  if (variants.length < 2) return null;
  const activeId = state.variantId ?? variants[0]?.id;
  return (
    <>
      <h2 className="form-section-title">Stil</h2>
      <div className="chip-row">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            className={`chip ${variant.id === activeId ? "selected" : ""}`}
            onClick={() =>
              dispatch({ type: "chooseVariant", variantId: variant.id })
            }
          >
            {variant.name}
          </button>
        ))}
      </div>
    </>
  );
}

function PaletteChips({ template }: { template: Template }) {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const activeId = state.paletteId ?? template.palettes[0]?.id;
  const palettes = [...template.palettes, ...brandPalettesFor(template, kit)];
  return (
    <div className="chip-row">
      {palettes.map((palette) => (
        <button
          key={palette.id}
          type="button"
          className={`chip palette-chip ${palette.id === activeId ? "selected" : ""}`}
          onClick={() =>
            dispatch({ type: "choosePalette", paletteId: palette.id })
          }
        >
          <span
            className="palette-dot"
            style={{ background: palette.colors.accent }}
          />
          <span
            className="palette-dot"
            style={{ background: palette.colors.background }}
          />
          {palette.name}
        </button>
      ))}
    </div>
  );
}

/** Bold / italic / font for the selected text field. */
function TextStyleControls({ slot }: { slot: TextSlot }) {
  const { state, dispatch } = useWizard();
  const value = state.values[slot.id];
  const current: TextValue =
    value?.type === "text" ? value : { type: "text", text: "" };

  function update(patch: Partial<TextValue>) {
    // A styled-but-empty field would render nothing; keep the example text
    // visible by storing the style on the (still empty) value.
    dispatch({
      type: "setValue",
      slotId: slot.id,
      value: { ...current, ...patch, type: "text" },
    });
  }

  const activeFont: FontChoice = current.font ?? "vorlage";
  return (
    <>
      <div className="button-row">
        <button
          type="button"
          className={`button-secondary ${current.bold ? "is-active" : ""}`}
          aria-pressed={current.bold === true}
          onClick={() => update({ bold: !current.bold })}
        >
          <b>Fett</b>
        </button>
        <button
          type="button"
          className={`button-secondary ${current.italic ? "is-active" : ""}`}
          aria-pressed={current.italic === true}
          onClick={() => update({ italic: !current.italic })}
        >
          <i>Kursiv</i>
        </button>
      </div>
      <div className="chip-row">
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${option.id === activeFont ? "selected" : ""}`}
            style={option.family ? { fontFamily: option.family } : undefined}
            onClick={() => update({ font: option.id })}
          >
            {option.name}
          </button>
        ))}
      </div>
    </>
  );
}

export function AdjustStep() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("frame");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<GestureState>({
    pointers: new Map(),
    lastDistance: null,
    moved: false,
    historyPushed: false,
  });
  const history = useRef<Record<string, SlotAdjustment>[]>([]);
  const [historySize, setHistorySize] = useState(0);

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
  const formatId = state.formatId;
  const format = getFormat(formatId);
  const slides = templateSlides(template);
  const bounds = canvasBounds(template, formatId);
  const selectedSlot = template.slots.find((slot) => slot.id === selectedId);
  const selectedText =
    selectedSlot?.type === "text" && !selectedSlot.fixed ? selectedSlot : null;
  const photoValue = state.values.photo;
  const isPhotoSelected = selectedSlot?.type === "photo";
  const cropping = isPhotoSelected && photoMode === "crop";

  /** Extra text fields this template adds beyond the four universal ones. */
  const extraFields = template.slots.filter(
    (slot): slot is TextSlot =>
      slot.type === "text" && !slot.fixed && !isContentSlot(slot.id),
  );

  /**
   * Screen (CSS px) → canvas coordinates. Carousel previews show one canvas
   * per slide side by side; the point maps into the slide-widened space
   * (slide k adds k·width), so hit-testing works on the wide slot frames.
   */
  function toCanvasPoint(clientX: number, clientY: number) {
    const canvases = [
      ...(wrapperRef.current?.querySelectorAll("canvas") ?? []),
    ].filter((c) => c.getBoundingClientRect().width > 0);
    if (canvases.length === 0) return null;
    const hit = canvases.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right;
    });
    const index = hit >= 0 ? hit : 0;
    const canvas = canvases[index];
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: (clientX - rect.left) * scale + index * canvas.width,
      y: (clientY - rect.top) * scale,
      scale,
    };
  }

  function pushHistory() {
    if (gesture.current.historyPushed) return;
    gesture.current.historyPushed = true;
    history.current = [...history.current.slice(-9), state.adjustments];
    setHistorySize(history.current.length);
  }

  function updateAdjustment(
    slotId: string,
    update: (current: SlotAdjustment) => SlotAdjustment,
  ) {
    const slot = template?.slots.find((s) => s.id === slotId);
    if (!slot || !template) return;
    const current = state.adjustments[slotId] ?? IDENTITY_ADJUSTMENT;
    dispatch({
      type: "setAdjustment",
      slotId,
      adjustment: clampAdjustment(
        update(current),
        slot.guardrails ?? LOCKED,
        slot.frames[formatId],
        bounds,
      ),
    });
  }

  /** Pan/zoom the photo inside its box (only in "Ausschnitt" mode). */
  function updateCrop(update: (value: PhotoValue) => PhotoValue) {
    if (photoValue?.type !== "photo") return;
    dispatch({ type: "setValue", slotId: "photo", value: update(photoValue) });
  }

  function onPointerDown(event: React.PointerEvent) {
    wrapperRef.current?.setPointerCapture(event.pointerId);
    gesture.current.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    gesture.current.lastDistance = null;
    if (gesture.current.pointers.size === 1) {
      gesture.current.moved = false;
      gesture.current.historyPushed = false;
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const { pointers } = gesture.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const point = toCanvasPoint(event.clientX, event.clientY);
    if (!point || !selectedId || !selectedSlot) return;

    if (pointers.size === 1) {
      const dx = (event.clientX - previous.x) * point.scale;
      const dy = (event.clientY - previous.y) * point.scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
      if (!gesture.current.moved) return;
      if (cropping && template) {
        const frame = effectiveFrame(
          selectedSlot,
          template,
          formatId,
          state.adjustments,
        );
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
        return;
      }
      pushHistory();
      updateAdjustment(selectedId, (a) => ({
        ...a,
        dx: a.dx + dx,
        dy: a.dy + dy,
      }));
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const last = gesture.current.lastDistance;
      if (last !== null && last > 0) {
        gesture.current.moved = true;
        if (cropping) {
          updateCrop((value) => ({
            ...value,
            crop: zoomCrop(value.crop, distance / last),
          }));
        } else {
          pushHistory();
          updateAdjustment(selectedId, (adj) => ({
            ...adj,
            scale: adj.scale * (distance / last),
          }));
        }
      }
      gesture.current.lastDistance = distance;
    }
  }

  function onPointerEnd(event: React.PointerEvent) {
    const { pointers, moved } = gesture.current;
    pointers.delete(event.pointerId);
    gesture.current.lastDistance = null;
    // A tap (no movement) selects/deselects.
    if (pointers.size === 0 && !moved) {
      if (!template) return;
      const point = toCanvasPoint(event.clientX, event.clientY);
      if (point) {
        const hit = findAdjustableSlotAt(
          template,
          formatId,
          state.adjustments,
          point.x,
          point.y,
        );
        setSelectedId(hit);
        setPhotoMode("frame");
      }
    }
  }

  function undo() {
    const last = history.current.pop();
    setHistorySize(history.current.length);
    if (last) dispatch({ type: "setAllAdjustments", adjustments: last });
  }

  function resetSelected() {
    if (!selectedId) return;
    pushHistory();
    gesture.current.historyPushed = false;
    dispatch({ type: "setAdjustment", slotId: selectedId, adjustment: null });
  }

  function resetAll() {
    pushHistory();
    gesture.current.historyPushed = false;
    dispatch({ type: "setAllAdjustments", adjustments: {} });
  }

  /** One tap on a size button = one undoable step. */
  function stepSize(factor: number) {
    if (!selectedId) return;
    gesture.current.historyPushed = false;
    if (cropping) {
      updateCrop((value) => ({ ...value, crop: zoomCrop(value.crop, factor) }));
      return;
    }
    pushHistory();
    updateAdjustment(selectedId, (a) => ({ ...a, scale: a.scale * factor }));
  }

  const rails = selectedSlot?.guardrails;
  const currentScale = selectedId
    ? (state.adjustments[selectedId]?.scale ?? 1)
    : 1;
  const hasAdjustments = Object.keys(state.adjustments).length > 0;

  return (
    <>
      <h2 className="form-section-title">Farben</h2>
      <PaletteChips template={template} />
      <VariantChips template={template} />

      <h2 className="form-section-title">Feinschliff</h2>
      <p className="step-hint">
        {selectedSlot
          ? cropping
            ? "Ziehe am Bild, um den Ausschnitt zu wählen."
            : "Ziehe das Element an seinen Platz – auch über den Rand hinaus."
          : "Tippe auf ein Element mit gestricheltem Rahmen, um es zu bewegen."}
      </p>
      <div
        ref={wrapperRef}
        className={`post-preview adjust-preview ${slides > 1 ? "is-carousel" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {Array.from({ length: slides }, (_, slide) => (
          <div
            className="preview-stage"
            // biome-ignore lint/suspicious/noArrayIndexKey: slide order is fixed — the index IS the slide's identity.
            key={slide}
          >
            <PostPreview
              input={{ ...buildRenderInput(state, template, kit), slide }}
              ariaLabel={
                slides === 1
                  ? "Vorschau deines Posts"
                  : `Vorschau Bild ${slide + 1} von ${slides}`
              }
            />
            {/* Dashed hints on movable elements; solid outline when selected. */}
            {template.slots
              .filter((slot) => slot.guardrails?.movable)
              .map((slot) => {
                const frame = effectiveFrame(
                  slot,
                  template,
                  formatId,
                  state.adjustments,
                );
                // Skip outlines that lie entirely on another slide.
                const left = frame.x - slide * format.width;
                if (left + frame.w <= 0 || left >= format.width) return null;
                return (
                  <span
                    key={slot.id}
                    className={`slot-outline ${slot.id === selectedId ? "selected" : ""}`}
                    style={{
                      left: `${(left / format.width) * 100}%`,
                      top: `${(frame.y / format.height) * 100}%`,
                      width: `${(frame.w / format.width) * 100}%`,
                      height: `${(frame.h / format.height) * 100}%`,
                    }}
                  />
                );
              })}
          </div>
        ))}
      </div>

      {isPhotoSelected && (
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${photoMode === "frame" ? "selected" : ""}`}
            onClick={() => setPhotoMode("frame")}
          >
            Rahmen bewegen
          </button>
          <button
            type="button"
            className={`chip ${photoMode === "crop" ? "selected" : ""}`}
            onClick={() => setPhotoMode("crop")}
          >
            Bildausschnitt
          </button>
        </div>
      )}

      {selectedSlot && rails && (
        <div className="button-row">
          <button
            type="button"
            className="button-secondary"
            disabled={!cropping && currentScale <= rails.minScale * 1.001}
            onClick={() => stepSize(1 / SIZE_STEP)}
          >
            − Kleiner
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={!cropping && currentScale >= rails.maxScale * 0.999}
            onClick={() => stepSize(SIZE_STEP)}
          >
            + Größer
          </button>
        </div>
      )}

      {selectedText && <TextStyleControls slot={selectedText} />}

      <div className="button-row">
        <button
          type="button"
          className="button-secondary"
          disabled={historySize === 0}
          onClick={undo}
        >
          ↩︎ Rückgängig
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!selectedId}
          onClick={resetSelected}
        >
          Element zurück
        </button>
      </div>
      {hasAdjustments && (
        <button type="button" className="button-link" onClick={resetAll}>
          Alles wieder an seinen Platz
        </button>
      )}

      {extraFields.length > 0 && (
        <>
          <h2 className="form-section-title">
            Zusätzliche Felder für diese Vorlage
          </h2>
          {extraFields.map((slot) => (
            <TextField key={slot.id} slot={slot} />
          ))}
        </>
      )}
    </>
  );
}
