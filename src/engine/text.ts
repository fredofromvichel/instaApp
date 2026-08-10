/**
 * Text auto-fit: the guarantee that user text can never break a layout
 * (SPEC.md §8). Pure logic with an injected measure function, so it is
 * unit-testable without a canvas; the renderer injects ctx.measureText.
 *
 * The engine is style-aware (the RTF-lite layer, SPEC.md §6): a text is a
 * sequence of runs, each with bold/italic/color/size, and wrapping, fitting
 * and truncation all work on runs. Plain text is just the single-run case —
 * `wrapText`/`autoFitText` keep their simple string API on top of it.
 */
import type { TextSpan } from "./types";

/* ------------------------------------------------------------------- runs */

export interface RunStyle {
  bold: boolean;
  italic: boolean;
  /** ColorRole name or #rrggbb; undefined = the slot's own color. */
  color?: string;
  /** Factor on the base font size (1 = normal). */
  size: number;
}

export const PLAIN_STYLE: RunStyle = { bold: false, italic: false, size: 1 };

export interface StyledRun {
  text: string;
  style: RunStyle;
}

/** Width of `text` at `fontSize` in the given style (renderer sets the font). */
export type StyledMeasureFn = (
  text: string,
  fontSize: number,
  style: RunStyle,
) => number;

/** Simple string measure — the plain-text API. */
export type MeasureFn = (text: string, fontSize: number) => number;

export interface StyledLine {
  parts: StyledRun[];
  width: number;
  /** Largest size factor on the line — its height follows the biggest run. */
  maxSize: number;
}

/**
 * Split a text into styled runs. Field-level bold/italic form the base;
 * spans override per range, later spans winning where they overlap.
 */
export function spansToRuns(
  text: string,
  spans: TextSpan[] | undefined,
  base: { bold?: boolean; italic?: boolean } = {},
): StyledRun[] {
  const list = (spans ?? []).filter((s) => s.start < s.end);
  if (list.length === 0) {
    return [
      {
        text,
        style: {
          bold: base.bold === true,
          italic: base.italic === true,
          size: 1,
        },
      },
    ];
  }
  const cuts = new Set<number>([0, text.length]);
  for (const span of list) {
    cuts.add(Math.max(0, Math.min(text.length, span.start)));
    cuts.add(Math.max(0, Math.min(text.length, span.end)));
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  const runs: StyledRun[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i] ?? 0;
    const end = sorted[i + 1] ?? 0;
    if (start >= end) continue;
    const style: RunStyle = {
      bold: base.bold === true,
      italic: base.italic === true,
      size: 1,
    };
    for (const span of list) {
      if (span.start <= start && span.end >= end) {
        if (span.bold !== undefined) style.bold = span.bold;
        if (span.italic !== undefined) style.italic = span.italic;
        if (span.color !== undefined) style.color = span.color;
        if (span.size !== undefined) style.size = span.size;
      }
    }
    runs.push({ text: text.slice(start, end), style });
  }
  return runs;
}

/* ------------------------------------------------------------------- wrap */

function partsWidth(
  parts: StyledRun[],
  fontSize: number,
  measure: StyledMeasureFn,
): number {
  let width = 0;
  for (const part of parts) {
    width += measure(part.text, fontSize, part.style);
  }
  return width;
}

function maxSizeOf(parts: StyledRun[]): number {
  let max = 0;
  for (const part of parts) max = Math.max(max, part.style.size);
  return max || 1;
}

/** One whitespace-separated word, possibly spanning style boundaries. */
interface Token {
  parts: StyledRun[];
}

function tokenize(runs: StyledRun[]): Token[][] {
  // Paragraphs (explicit \n) of words; each word keeps its styled parts.
  const paragraphs: Token[][] = [[]];
  let word: StyledRun[] = [];
  const pushWord = () => {
    if (word.length > 0) {
      paragraphs[paragraphs.length - 1]?.push({ parts: word });
      word = [];
    }
  };
  for (const run of runs) {
    let buffer = "";
    const flush = () => {
      if (buffer !== "") {
        word.push({ text: buffer, style: run.style });
        buffer = "";
      }
    };
    for (const char of run.text) {
      if (char === "\n") {
        flush();
        pushWord();
        paragraphs.push([]);
      } else if (/\s/.test(char)) {
        flush();
        pushWord();
      } else {
        buffer += char;
      }
    }
    flush();
  }
  pushWord();
  return paragraphs;
}

/** Hard-break one overlong word into width-fitting styled chunks. */
function breakWord(
  parts: StyledRun[],
  fontSize: number,
  maxWidth: number,
  measure: StyledMeasureFn,
): StyledRun[][] {
  const chunks: StyledRun[][] = [];
  let current: StyledRun[] = [];
  let width = 0;
  for (const part of parts) {
    for (const char of part.text) {
      const charWidth = measure(char, fontSize, part.style);
      if (width + charWidth > maxWidth && current.length > 0) {
        chunks.push(current);
        current = [];
        width = 0;
      }
      const last = current[current.length - 1];
      if (last && last.style === part.style) last.text += char;
      else current.push({ text: char, style: part.style });
      width += charWidth;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Greedy word-wrap of styled runs at a fixed base font size. */
export function wrapStyled(
  runs: StyledRun[],
  fontSize: number,
  maxWidth: number,
  measure: StyledMeasureFn,
): StyledLine[] {
  const lines: StyledLine[] = [];
  const pushLine = (parts: StyledRun[]) => {
    lines.push({
      parts,
      width: partsWidth(parts, fontSize, measure),
      maxSize: maxSizeOf(parts),
    });
  };

  for (const words of tokenize(runs)) {
    if (words.length === 0) {
      pushLine([]);
      continue;
    }
    let current: StyledRun[] = [];
    let width = 0;
    for (const word of words) {
      const wordWidth = partsWidth(word.parts, fontSize, measure);
      const spaceStyle =
        current[current.length - 1]?.style ?? word.parts[0]?.style;
      const spaceWidth =
        current.length > 0 && spaceStyle
          ? measure(" ", fontSize, spaceStyle)
          : 0;
      if (current.length > 0 && width + spaceWidth + wordWidth <= maxWidth) {
        if (spaceStyle) current.push({ text: " ", style: spaceStyle });
        current.push(...word.parts.map((p) => ({ ...p })));
        width += spaceWidth + wordWidth;
        continue;
      }
      if (current.length === 0 && wordWidth <= maxWidth) {
        current = word.parts.map((p) => ({ ...p }));
        width = wordWidth;
        continue;
      }
      if (current.length > 0) {
        pushLine(current);
        current = [];
        width = 0;
      }
      if (wordWidth > maxWidth) {
        const chunks = breakWord(word.parts, fontSize, maxWidth, measure);
        for (let i = 0; i < chunks.length - 1; i++) {
          const chunk = chunks[i];
          if (chunk) pushLine(chunk);
        }
        const tail = chunks[chunks.length - 1];
        if (tail) {
          current = tail;
          width = partsWidth(tail, fontSize, measure);
        }
      } else {
        current = word.parts.map((p) => ({ ...p }));
        width = wordWidth;
      }
    }
    if (current.length > 0) pushLine(current);
  }
  return lines;
}

/* -------------------------------------------------------------------- fit */

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

export interface StyledFitOptions extends Omit<AutoFitOptions, "measure"> {
  measure: StyledMeasureFn;
}

export interface StyledFitResult {
  fontSize: number;
  lines: StyledLine[];
  /** True when even minSize could not fit everything and text was truncated. */
  overflow: boolean;
}

export interface AutoFitResult {
  fontSize: number;
  lines: string[];
  overflow: boolean;
}

const ELLIPSIS = "…";

function blockHeight(
  lines: StyledLine[],
  fontSize: number,
  lineHeight: number,
): number {
  let height = 0;
  for (const line of lines) height += fontSize * lineHeight * line.maxSize;
  return height;
}

function fits(
  lines: StyledLine[],
  fontSize: number,
  opts: StyledFitOptions,
): boolean {
  return (
    lines.length <= opts.maxLines &&
    blockHeight(lines, fontSize, opts.lineHeight) <= opts.maxHeight
  );
}

/**
 * Find the largest base font size in [minSize, maxSize] at which the styled
 * text fits its box (line count, width, and height). If even minSize does not
 * fit, the text is truncated with an ellipsis and `overflow` is reported —
 * the layout itself never breaks.
 */
export function autoFitStyled(
  runs: StyledRun[],
  opts: StyledFitOptions,
): StyledFitResult {
  const hasContent = runs.some((run) => run.text.trim() !== "");
  if (!hasContent) {
    return { fontSize: opts.maxSize, lines: [], overflow: false };
  }

  // Wrapping is not strictly monotone in font size, so scan downward instead
  // of binary-searching; the range is small (typically < 100 integer sizes).
  for (let size = Math.floor(opts.maxSize); size >= opts.minSize; size--) {
    const lines = wrapStyled(runs, size, opts.maxWidth, opts.measure);
    if (fits(lines, size, opts)) {
      return { fontSize: size, lines, overflow: false };
    }
  }

  // Truncate at minSize: keep as many lines as height + line cap allow.
  const size = opts.minSize;
  const all = wrapStyled(runs, size, opts.maxWidth, opts.measure);
  const kept: StyledLine[] = [];
  for (const line of all) {
    if (kept.length + 1 > opts.maxLines) break;
    if (
      blockHeight([...kept, line], size, opts.lineHeight) > opts.maxHeight &&
      kept.length > 0
    ) {
      break;
    }
    kept.push(line);
  }
  const last = kept[kept.length - 1];
  if (last) {
    const tailStyle = last.parts[last.parts.length - 1]?.style ?? PLAIN_STYLE;
    const ellipsisWidth = opts.measure(ELLIPSIS, size, tailStyle);
    while (
      last.parts.length > 0 &&
      partsWidth(last.parts, size, opts.measure) + ellipsisWidth > opts.maxWidth
    ) {
      const tail = last.parts[last.parts.length - 1];
      if (!tail) break;
      tail.text = tail.text.slice(0, -1).trimEnd();
      if (tail.text === "") last.parts.pop();
    }
    const anchor = last.parts[last.parts.length - 1];
    if (anchor) anchor.text += ELLIPSIS;
    else last.parts.push({ text: ELLIPSIS, style: tailStyle });
    last.width = partsWidth(last.parts, size, opts.measure);
  }
  return { fontSize: size, lines: kept, overflow: true };
}

/* ------------------------------------------------------- plain-string API */

const plainRuns = (text: string): StyledRun[] => [{ text, style: PLAIN_STYLE }];

const adapt =
  (measure: MeasureFn): StyledMeasureFn =>
  (text, fontSize, style) =>
    measure(text, fontSize * style.size);

const lineText = (line: StyledLine): string =>
  line.parts.map((p) => p.text).join("");

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
  return wrapStyled(plainRuns(text), fontSize, maxWidth, adapt(measure)).map(
    lineText,
  );
}

/** Plain-text auto-fit — the single-run case of `autoFitStyled`. */
export function autoFitText(text: string, opts: AutoFitOptions): AutoFitResult {
  const result = autoFitStyled(plainRuns(text.trim()), {
    ...opts,
    measure: adapt(opts.measure),
  });
  return {
    fontSize: result.fontSize,
    lines: result.lines.map(lineText),
    overflow: result.overflow,
  };
}
