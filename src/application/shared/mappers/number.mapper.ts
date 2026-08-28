export function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;

  const num = Number(value);

  if (isNaN(num) || num === 0) return null;

  return num;
}
