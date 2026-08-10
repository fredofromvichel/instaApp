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
import { canvasBounds, effectiveFrame, resolvePalette } from "../engine/render";
import type {
  FontChoice,
  Palette,
  PhotoValue,
  SlotAdjustment,
  Template,
  TextSlot,
  TextSpan,
  TextValue,
} from "../engine/types";
import {
  CONTENT_TEXT_LIMIT,
  IDENTITY_ADJUSTMENT,
  isContentSlot,
  LOCKED,
  templateSlides,
} from "../engine/types";
import { panCrop, zoomCrop } from "../lib/cropGestures";
import { getFormat } from "../lib/formats";
import { findAdjustableSlotAt } from "../lib/hitTest";
import { brandPalettesFor, buildRenderInput } from "../lib/renderInput";
import { applySpan, effectiveStyleAt, remapSpans } from "../lib/textSpans";
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

/** Size-factor bounds for a formatted range. */
const SPAN_SIZE_MIN = 0.4;
const SPAN_SIZE_MAX = 3;

/**
 * The RTF-lite editor for the selected text (SPEC.md §6): edit the text in
 * place, select a range, then make just that range bold/italic, bigger/
 * smaller, or a different color. Without a selection, bold/italic switch the
 * whole field (so the example text previews the style too), and size/color
 * apply to the whole text.
 */
function TextEditor({ slot, palette }: { slot: TextSlot; palette: Palette }) {
  const { state, dispatch } = useWizard();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [sel, setSel] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const value = state.values[slot.id];
  const current: TextValue =
    value?.type === "text" ? value : { type: "text", text: "" };
  const text = current.text;
  const hasSelection = sel.start < sel.end;
  const hasText = text.trim() !== "";

  function commit(next: TextValue) {
    dispatch({ type: "setValue", slotId: slot.id, value: next });
  }

  function syncSelection() {
    const el = areaRef.current;
    if (!el) return;
    setSel({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
  }

  /** The range a formatting tap applies to. */
  function targetRange(): [number, number] {
    return hasSelection ? [sel.start, sel.end] : [0, text.length];
  }

  /** Style at the caret/selection start — the toggles flip against this. */
  const styleAtCaret = effectiveStyleAt(
    current,
    Math.min(sel.start, Math.max(0, text.length - 1)),
  );

  function format(patch: Omit<TextSpan, "start" | "end">) {
    const [start, end] = targetRange();
    commit({ ...current, spans: applySpan(current.spans, start, end, patch) });
  }

  function toggle(key: "bold" | "italic") {
    if (!hasSelection || !hasText) {
      // Whole-field toggle: also styles the example text of an empty field.
      commit({ ...current, [key]: current[key] !== true });
      return;
    }
    format({ [key]: !styleAtCaret[key] });
  }

  function stepSpanSize(factor: number) {
    const size = Math.min(
      SPAN_SIZE_MAX,
      Math.max(SPAN_SIZE_MIN, styleAtCaret.size * factor),
    );
    format({ size });
  }

  /** Resolved hex the color picker opens with — never black-by-default. */
  const currentHex = (() => {
    const c = styleAtCaret.color;
    if (c?.startsWith("#")) return c;
    const roleColor = c
      ? palette.colors[c as keyof Palette["colors"]]
      : undefined;
    return roleColor ?? palette.colors[slot.color];
  })();

  /** Keep the textarea's selection alive across toolbar taps. */
  const keepSelection = (e: React.PointerEvent) => e.preventDefault();
  const activeFont: FontChoice = current.font ?? "vorlage";
  const rangeHint = hasSelection
    ? "Wirkt auf den markierten Text."
    : "Markiere Text, um nur einen Teil zu ändern – sonst gilt es für alles.";

  return (
    <>
      <h2 className="form-section-title">Text bearbeiten</h2>
      <div className="field">
        <textarea
          ref={areaRef}
          rows={3}
          value={text}
          maxLength={CONTENT_TEXT_LIMIT}
          placeholder={slot.example}
          onChange={(e) => {
            const nextText = e.target.value;
            commit({
              ...current,
              text: nextText,
              spans: remapSpans(current.spans, text, nextText),
            });
          }}
          onSelect={syncSelection}
          onKeyUp={syncSelection}
          onBlur={syncSelection}
        />
        <p className="field-hint">{rangeHint}</p>
      </div>
      <div className="button-row">
        <button
          type="button"
          className={`button-secondary ${styleAtCaret.bold ? "is-active" : ""}`}
          aria-pressed={styleAtCaret.bold}
          onPointerDown={keepSelection}
          onClick={() => toggle("bold")}
        >
          <b>Fett</b>
        </button>
        <button
          type="button"
          className={`button-secondary ${styleAtCaret.italic ? "is-active" : ""}`}
          aria-pressed={styleAtCaret.italic}
          onPointerDown={keepSelection}
          onClick={() => toggle("italic")}
        >
          <i>Kursiv</i>
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!hasText}
          onPointerDown={keepSelection}
          onClick={() => stepSpanSize(1 / 1.2)}
          aria-label="Schrift kleiner"
        >
          A−
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!hasText}
          onPointerDown={keepSelection}
          onClick={() => stepSpanSize(1.2)}
          aria-label="Schrift größer"
        >
          A+
        </button>
      </div>
      <div className="chip-row">
        <button
          type="button"
          className="chip"
          disabled={!hasText}
          onPointerDown={keepSelection}
          onClick={() => format({ color: "" })}
        >
          Farbe wie Vorlage
        </button>
        {(["text", "accent", "muted", "textOnAccent"] as const).map((role) => (
          <button
            key={role}
            type="button"
            className="chip color-chip"
            disabled={!hasText}
            aria-label={`Textfarbe ${role}`}
            onPointerDown={keepSelection}
            onClick={() => format({ color: role })}
          >
            <span
              className="palette-dot"
              style={{ background: palette.colors[role] }}
            />
          </button>
        ))}
        <label
          className="chip color-chip"
          aria-label="Eigene Textfarbe wählen"
          onPointerDown={keepSelection}
        >
          <span
            className="palette-dot color-wheel"
            style={{ background: currentHex }}
          />
          <input
            type="color"
            value={currentHex}
            disabled={!hasText}
            onChange={(e) => format({ color: e.target.value })}
          />
        </label>
      </div>
      <div className="chip-row">
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${option.id === activeFont ? "selected" : ""}`}
            style={option.family ? { fontFamily: option.family } : undefined}
            onClick={() => commit({ ...current, font: option.id })}
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
  /** Active edge-handle drag: which axes it resizes and where it started. */
  const resizing = useRef<{
    axis: "x" | "y" | "xy";
    startX: number;
    startY: number;
    base: SlotAdjustment;
    scale: number;
  } | null>(null);

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

  const activePalette = resolvePalette(buildRenderInput(state, template, kit));

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

  /** Drag of one of the selected outline's edge handles (box resize). */
  function onHandleDown(event: React.PointerEvent, axis: "x" | "y" | "xy") {
    if (!selectedId) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const canvas = wrapperRef.current?.querySelector("canvas");
    const scale =
      canvas && canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 1;
    gesture.current.historyPushed = false;
    pushHistory();
    resizing.current = {
      axis,
      startX: event.clientX,
      startY: event.clientY,
      base: state.adjustments[selectedId] ?? IDENTITY_ADJUSTMENT,
      scale,
    };
  }

  function onHandleMove(event: React.PointerEvent) {
    const drag = resizing.current;
    if (!drag || !selectedId) return;
    const dx = (event.clientX - drag.startX) * drag.scale;
    const dy = (event.clientY - drag.startY) * drag.scale;
    updateAdjustment(selectedId, () => ({
      ...drag.base,
      dw: (drag.base.dw ?? 0) + (drag.axis !== "y" ? dx : 0),
      dh: (drag.base.dh ?? 0) + (drag.axis !== "x" ? dy : 0),
    }));
  }

  function onHandleUp() {
    resizing.current = null;
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
            : "Ziehe das Element an seinen Platz. Mit den runden Griffen änderst du Breite und Höhe."
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
                const selected = slot.id === selectedId;
                const withHandles = selected && slot.guardrails?.resizable;
                return (
                  <span
                    key={slot.id}
                    className={`slot-outline ${selected ? "selected" : ""}`}
                    style={{
                      left: `${(left / format.width) * 100}%`,
                      top: `${(frame.y / format.height) * 100}%`,
                      width: `${(frame.w / format.width) * 100}%`,
                      height: `${(frame.h / format.height) * 100}%`,
                    }}
                  >
                    {withHandles &&
                      (
                        [
                          ["x", "handle-right"],
                          ["y", "handle-bottom"],
                          ["xy", "handle-corner"],
                        ] as const
                      ).map(([axis, cls]) => (
                        <span
                          key={axis}
                          className={`slot-handle ${cls}`}
                          role="slider"
                          aria-label={
                            axis === "x"
                              ? "Breite ändern"
                              : axis === "y"
                                ? "Höhe ändern"
                                : "Größe ändern"
                          }
                          onPointerDown={(e) => onHandleDown(e, axis)}
                          onPointerMove={onHandleMove}
                          onPointerUp={onHandleUp}
                          onPointerCancel={onHandleUp}
                        />
                      ))}
                  </span>
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

      {selectedText && (
        <TextEditor
          key={selectedText.id}
          slot={selectedText}
          palette={activePalette}
        />
      )}

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
