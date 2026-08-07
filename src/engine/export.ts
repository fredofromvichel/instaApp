/**
 * PNG export at exact target resolution — same render path as the preview.
 */
import { renderPost } from "./render";
import type { RenderInput } from "./types";

export async function exportPng(input: RenderInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderPost(canvas, input);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG-Export fehlgeschlagen"));
    }, "image/png");
  });
}
