/**
 * Photo loading (task 05): file from the phone's picker → decoded, correctly
 * oriented, downscaled image ready for the engine's PhotoValue.
 */

export interface LoadedPhoto {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * Working resolution cap. 2400px keeps pinch-zoomed crops sharp for the
 * 1080-wide export (zoom up to ~2× stays at native resolution) while keeping
 * memory in check on older phones.
 */
const MAX_DIMENSION = 2400;

function decodeViaImgElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/**
 * Decode a photo file with EXIF orientation applied.
 * - `createImageBitmap(file, {imageOrientation: "from-image"})` handles
 *   orientation and HEIC (on platforms that can decode it, e.g. iOS Safari).
 * - Fallback: <img> element decode — modern browsers orient it automatically
 *   (CSS `image-orientation: from-image` is the default).
 * Throws a German, user-facing Error when the format cannot be decoded.
 */
export async function loadPhotoFile(file: File): Promise<LoadedPhoto> {
  let decoded: ImageBitmap | HTMLImageElement;
  try {
    decoded = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      decoded = await decodeViaImgElement(file);
    } catch {
      throw new Error(
        "Das Foto konnte leider nicht geladen werden. Versuch bitte ein anderes Foto.",
      );
    }
  }

  const width = decoded.width;
  const height = decoded.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  if (scale === 1) return { source: decoded, width, height };

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { source: decoded, width, height };
  ctx.drawImage(decoded, 0, 0, canvas.width, canvas.height);
  if ("close" in decoded) decoded.close();
  return { source: canvas, width: canvas.width, height: canvas.height };
}
