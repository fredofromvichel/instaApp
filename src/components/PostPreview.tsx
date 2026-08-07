/**
 * Live preview canvas: renders the current design at full target resolution
 * (the engine's guarantee) and lets CSS scale it down. Reused by the template
 * grid thumbnails and the content/adjust/download steps.
 */
import { useEffect, useRef } from "react";
import { renderPost } from "../engine/render";
import type { RenderInput } from "../engine/types";

export function PostPreview({
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
