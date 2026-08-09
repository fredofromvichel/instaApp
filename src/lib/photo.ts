/**
 * Photo loading (task 05): image data from the phone's picker or the
 * clipboard → decoded, correctly oriented, downscaled image ready for the
 * engine's PhotoValue.
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

function decodeViaImgElement(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
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
 * Decode a photo (a picked file or a blob from the clipboard) with EXIF
 * orientation applied.
 * - `createImageBitmap(blob, {imageOrientation: "from-image"})` handles
 *   orientation and HEIC (on platforms that can decode it, e.g. iOS Safari).
 * - Fallback: <img> element decode — modern browsers orient it automatically
 *   (CSS `image-orientation: from-image` is the default).
 * Throws a German, user-facing Error when the format cannot be decoded.
 */
export async function loadPhotoBlob(source: Blob): Promise<LoadedPhoto> {
  let decoded: ImageBitmap | HTMLImageElement;
  try {
    decoded = await createImageBitmap(source, {
      imageOrientation: "from-image",
    });
  } catch {
    try {
      decoded = await decodeViaImgElement(source);
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
