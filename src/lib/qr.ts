/**
 * QR code generation (task 07). Always near-black on white with a quiet zone
 * and high error correction — maximum scannability from screens and prints,
 * independent of the chosen palette.
 */
import QRCode from "qrcode";

/**
 * Normalize user input into a full URL, or null if it can't be one.
 * Prepends https:// when the scheme is missing; requires a dotted hostname.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function generateQrCanvas(
  url: string,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 512,
    color: { dark: "#1a1a1aff", light: "#ffffffff" },
  });
  return canvas;
}
