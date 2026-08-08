/**
 * Step 4: Anpassen (task 08).
 * - Palette chips: tap to re-color the whole design.
 * - Light repositioning: tap an adjustable element → outline appears → drag
 *   to nudge, pinch to resize. Every change goes through clampAdjustment, so
 *   a broken layout is impossible by construction.
 * - Undo (last gestures) and reset (per element / whole design).
 */
import { useRef, useState } from "react";
import { PostPreview } from "../components/PostPreview";
import { clampAdjustment } from "../engine/geometry";
import { effectiveFrame } from "../engine/render";
import type { SlotAdjustment, Template } from "../engine/types";
import { IDENTITY_ADJUSTMENT, LOCKED, templateSlides } from "../engine/types";
import { getFormat } from "../lib/formats";
import { findAdjustableSlotAt } from "../lib/hitTest";
import { brandPalettesFor, buildRenderInput } from "../lib/renderInput";
import { useBrand } from "../state/brand";
import { useWizard } from "../state/wizard";
import { getTemplate } from "../templates/catalog";

interface GestureState {
  pointers: Map<number, { x: number; y: number }>;
  lastDistance: number | null;
  moved: boolean;
  historyPushed: boolean;
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

export function AdjustStep() {
  const { state, dispatch } = useWizard();
  const { kit } = useBrand();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const hasAdjustable = template.slots.some((slot) => slot.guardrails);
  const selectedSlot = template.slots.find((slot) => slot.id === selectedId);

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
    if (!slot) return;
    const current = state.adjustments[slotId] ?? IDENTITY_ADJUSTMENT;
    dispatch({
      type: "setAdjustment",
      slotId,
      adjustment: clampAdjustment(update(current), slot.guardrails ?? LOCKED),
    });
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
    if (!point || !selectedId) return;

    if (pointers.size === 1) {
      const dx = (event.clientX - previous.x) * point.scale;
      const dy = (event.clientY - previous.y) * point.scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
      if (!gesture.current.moved) return;
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
        pushHistory();
        updateAdjustment(selectedId, (adj) => ({
          ...adj,
          scale: adj.scale * (distance / last),
        }));
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
        setSelectedId(
          findAdjustableSlotAt(
            template,
            formatId,
            state.adjustments,
            point.x,
            point.y,
          ),
        );
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

  /** One tap on a size button = one undoable step. */
  function stepSize(factor: number) {
    if (!selectedId) return;
    gesture.current.historyPushed = false;
    pushHistory();
    updateAdjustment(selectedId, (a) => ({ ...a, scale: a.scale * factor }));
  }

  const selectionFrame = selectedSlot
    ? effectiveFrame(selectedSlot, formatId, state.adjustments)
    : null;

  // "Kleiner/Größer" buttons: an easier alternative to two-finger pinch.
  const rails = selectedSlot?.guardrails;
  const canResize = !!rails && (rails.minScale < 1 || rails.maxScale > 1);
  const currentScale = selectedId
    ? (state.adjustments[selectedId]?.scale ?? 1)
    : 1;

  return (
    <>
      <h2 className="form-section-title">Farben</h2>
      <PaletteChips template={template} />
      {hasAdjustable && (
        <>
          <h2 className="form-section-title">Feinschliff</h2>
          <p className="step-hint">
            {selectedSlot
              ? canResize
                ? "Ziehe das Element an seinen Platz. Die Größe änderst du mit den Knöpfen unten – oder mit zwei Fingern."
                : "Ziehe das Element an seinen Platz."
              : "Tippe auf ein Element mit gestricheltem Rahmen, um es zu verschieben."}
          </p>
        </>
      )}
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
            {/* Dashed hints on adjustable elements; solid outline when selected. */}
            {template.slots
              .filter((slot) => slot.guardrails)
              .map((slot) => {
                const frame = effectiveFrame(slot, formatId, state.adjustments);
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
      {canResize && rails && (
        <div className="button-row">
          <button
            type="button"
            className="button-secondary"
            disabled={currentScale <= rails.minScale * 1.001}
            onClick={() => stepSize(0.9)}
          >
            − Kleiner
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={currentScale >= rails.maxScale * 0.999}
            onClick={() => stepSize(1.1)}
          >
            + Größer
          </button>
        </div>
      )}
      {hasAdjustable && (
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
            disabled={!selectionFrame}
            onClick={resetSelected}
          >
            Zurücksetzen
          </button>
        </div>
      )}
    </>
  );
}
