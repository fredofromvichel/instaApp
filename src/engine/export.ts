/**
 * PNG export at exact target resolution — same render path as the preview.
 */
import { renderPost } from "./render";
import { type RenderInput, templateSlides } from "./types";

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

/**
 * Export every slide of the template — one PNG for normal templates, one per
 * carousel slide otherwise, in swipe order.
 */
export async function exportSlides(input: RenderInput): Promise<Blob[]> {
  const slides = templateSlides(input.template);
  const blobs: Blob[] = [];
  for (let slide = 0; slide < slides; slide++) {
    blobs.push(await exportPng({ ...input, slide }));
  }
  return blobs;
}
