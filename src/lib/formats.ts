/**
 * Instagram post formats supported by the app (SPEC.md §3).
 * All template geometry uses a 1080-based coordinate space.
 */
export interface PostFormat {
  id: "square" | "portrait" | "story";
  /** German display name shown in the format picker. */
  label: string;
  width: number;
  height: number;
}

export const POST_FORMATS: readonly PostFormat[] = [
  { id: "square", label: "Quadrat", width: 1080, height: 1080 },
  { id: "portrait", label: "Hochformat", width: 1080, height: 1350 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
] as const;

export function getFormat(id: PostFormat["id"]): PostFormat {
  const format = POST_FORMATS.find((f) => f.id === id);
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}
