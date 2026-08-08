/**
 * Live preview canvas: renders the current design at full target resolution
 * (the engine's guarantee) and lets CSS scale it down. Reused by the template
 * grid thumbnails and the content/adjust/download steps.
 *
 * Carousel templates render all slides side by side (a `.carousel-strip`),
 * so every existing call site previews the full swipe automatically.
 */
import { useEffect, useRef } from "react";
import { renderPost } from "../engine/render";
import { type RenderInput, templateSlides } from "../engine/types";

function SlideCanvas({
  input,
  ariaLabel,
}: {
  input: RenderInput;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) void renderPost(canvas, input);
  }, [input]);

  return <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />;
}

export function PostPreview({
  input,
  ariaLabel,
}: {
  input: RenderInput;
  ariaLabel?: string;
}) {
  const slides = templateSlides(input.template);
  if (slides === 1 || input.slide !== undefined) {
    return <SlideCanvas input={input} ariaLabel={ariaLabel} />;
  }
  return (
    <div className="carousel-strip" role="img" aria-label={ariaLabel}>
      {Array.from({ length: slides }, (_, slide) => (
        <SlideCanvas
          // biome-ignore lint/suspicious/noArrayIndexKey: slide order is fixed — the index IS the slide's identity.
          key={slide}
          input={{ ...input, slide }}
          ariaLabel={`Bild ${slide + 1} von ${slides}`}
        />
      ))}
    </div>
  );
}
