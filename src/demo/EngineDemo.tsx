/**
 * Dev demo page for the render engine (task 03): renders the sample template
 * in all three formats with generated demo content, a palette switcher, and
 * PNG export. Replaced by the real wizard UI in task 04.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { exportPng } from "../engine/export";
import { renderPost } from "../engine/render";
import type { RenderInput, SlotValue } from "../engine/types";
import { DEFAULT_CROP } from "../engine/types";
import { POST_FORMATS, type PostFormat } from "../lib/formats";
import { sampleTemplate } from "../templates/sample";

/** Generated placeholder "photo" so the demo needs no binary assets. */
function createDemoPhoto(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const sky = ctx.createLinearGradient(0, 0, 0, 1200);
  sky.addColorStop(0, "#f7d9b0");
  sky.addColorStop(0.6, "#e8a87c");
  sky.addColorStop(1, "#b5764f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1600, 1200);
  ctx.fillStyle = "#fff3dd";
  ctx.beginPath();
  ctx.arc(1200, 340, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a3b";
  ctx.beginPath();
  ctx.ellipse(500, 1150, 700, 320, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#6f4630";
  ctx.beginPath();
  ctx.ellipse(1250, 1230, 620, 340, 0, Math.PI, 0);
  ctx.fill();
  return canvas;
}

/** Deterministic fake QR pattern — real QR generation arrives with task 07. */
function createFakeQr(url: string): HTMLCanvasElement {
  const modules = 21;
  const scale = 10;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = modules * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1a1a";
  let hash = 7;
  for (const char of url) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      hash = (hash * 1103515245 + 12345) | 0;
      if ((hash >>> 16) % 2 === 0) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  // Finder squares so it reads as "QR" at a glance.
  for (const [fx, fy] of [
    [0, 0],
    [modules - 7, 0],
    [0, modules - 7],
  ] as const) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(fx * scale, fy * scale, 7 * scale, 7 * scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((fx + 1) * scale, (fy + 1) * scale, 5 * scale, 5 * scale);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect((fx + 2) * scale, (fy + 2) * scale, 3 * scale, 3 * scale);
  }
  return canvas;
}

function FormatPreview({
  format,
  values,
  paletteId,
}: {
  format: PostFormat;
  values: Record<string, SlotValue>;
  paletteId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input: RenderInput = useMemo(
    () => ({
      template: sampleTemplate,
      formatId: format.id,
      paletteId,
      values,
    }),
    [format.id, paletteId, values],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) void renderPost(canvas, input);
  }, [input]);

  async function download() {
    const blob = await exportPng(input);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insta-studio-${format.id}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <figure style={{ margin: 0, width: "min(100%, 300px)" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        }}
      />
      <figcaption
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <span>
          {format.label} · {format.width}×{format.height}
        </span>
        <button type="button" onClick={() => void download()}>
          PNG ⬇
        </button>
      </figcaption>
    </figure>
  );
}

export function EngineDemo() {
  const [paletteId, setPaletteId] = useState(
    sampleTemplate.palettes[0]?.id ?? "",
  );

  const values = useMemo<Record<string, SlotValue>>(() => {
    const photo = createDemoPhoto();
    const qr = createFakeQr("https://example.de/angebot");
    return {
      photo: {
        type: "photo",
        source: photo,
        width: photo.width,
        height: photo.height,
        crop: DEFAULT_CROP,
      },
      qr: { type: "image", source: qr, width: qr.width, height: qr.height },
      // Text slots intentionally omitted → renderer falls back to examples.
    };
  }, []);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
        Engine-Demo: „{sampleTemplate.name}“
      </h2>
      <div style={{ display: "flex", gap: 8 }}>
        {sampleTemplate.palettes.map((palette) => (
          <button
            key={palette.id}
            type="button"
            onClick={() => setPaletteId(palette.id)}
            style={{
              borderRadius: 999,
              border:
                palette.id === paletteId
                  ? "2px solid #2a2621"
                  : "2px solid transparent",
              background: palette.colors.accent,
              color: palette.colors.textOnAccent,
              padding: "0 16px",
            }}
          >
            {palette.name}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "center",
        }}
      >
        {POST_FORMATS.map((format) => (
          <FormatPreview
            key={format.id}
            format={format}
            values={values}
            paletteId={paletteId}
          />
        ))}
      </div>
    </section>
  );
}
