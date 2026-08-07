/**
 * Text auto-fit: the guarantee that user text can never break a layout
 * (SPEC.md §8). Pure logic with an injected measure function, so it is
 * unit-testable without a canvas; the renderer injects ctx.measureText.
 */

/** Returns the rendered width of `text` at `fontSize` px. */
export type MeasureFn = (text: string, fontSize: number) => number;

export interface AutoFitOptions {
  maxWidth: number;
  maxHeight: number;
  maxLines: number;
  minSize: number;
  maxSize: number;
  /** Factor, e.g. 1.2. */
  lineHeight: number;
  measure: MeasureFn;
}

export interface AutoFitResult {
  fontSize: number;
  lines: string[];
  /** True when even minSize could not fit everything and text was truncated. */
  overflow: boolean;
}

const ELLIPSIS = "…";

/**
 * Greedy word-wrap at a fixed font size. Explicit newlines are respected;
 * a single word wider than maxWidth is broken by characters (never overflows).
 */
export function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureFn,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current === "" ? word : `${current} ${word}`;
      if (measure(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current !== "") {
        lines.push(current);
        current = "";
      }
      // Word alone is too wide → hard-break by characters.
      if (measure(word, fontSize) > maxWidth) {
        let chunk = "";
        for (const char of word) {
          if (chunk !== "" && measure(chunk + char, fontSize) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current !== "") lines.push(current);
  }
  return lines;
}

function fits(
  lines: string[],
  fontSize: number,
  opts: AutoFitOptions,
): boolean {
  return (
    lines.length <= opts.maxLines &&
    lines.length * fontSize * opts.lineHeight <= opts.maxHeight
  );
}

/**
 * Find the largest font size in [minSize, maxSize] at which the text fits its
 * box (line count, width, and height). If even minSize does not fit, the text
 * is truncated with an ellipsis and `overflow` is reported so the UI can show
 * a gentle hint (task 06) — the layout itself never breaks.
 */
export function autoFitText(text: string, opts: AutoFitOptions): AutoFitResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { fontSize: opts.maxSize, lines: [], overflow: false };
  }

  // Wrapping is not strictly monotone in font size, so scan downward instead
  // of binary-searching; the range is small (typically < 60 integer sizes).
  for (let size = Math.floor(opts.maxSize); size >= opts.minSize; size--) {
    const lines = wrapText(trimmed, size, opts.maxWidth, opts.measure);
    if (fits(lines, size, opts)) {
      return { fontSize: size, lines, overflow: false };
    }
  }

  // Truncate at minSize.
  const size = opts.minSize;
  const allLines = wrapText(trimmed, size, opts.maxWidth, opts.measure);
  const maxByHeight = Math.floor(opts.maxHeight / (size * opts.lineHeight));
  const lineCount = Math.max(1, Math.min(opts.maxLines, maxByHeight));
  const lines = allLines.slice(0, lineCount);
  let last = lines[lines.length - 1] ?? "";
  while (
    last.length > 0 &&
    opts.measure(last + ELLIPSIS, size) > opts.maxWidth
  ) {
    last = last.slice(0, -1).trimEnd();
  }
  lines[lines.length - 1] = last + ELLIPSIS;
  return { fontSize: size, lines, overflow: true };
}
