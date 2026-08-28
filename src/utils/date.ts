/**
 * Formatter para DD/MM/YYYY (ej: 09/07/2025)
 */
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Formatter para DD de mes de YYYY (ej: 09 de julio de 2025)
 */
const longDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/**
 * Formatea una fecha como DD/MM/YYYY
 * @param input Fecha como Date o string ISO
 * @returns string con formato corto
 */
export function formatDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return dateFormatter.format(date);
}

/**
 * Formatea una fecha como "DD de mes de YYYY"
 * @param input Fecha como Date o string ISO
 * @returns string con formato largo (ej: 09 de julio de 2025)
 */
export function formatDateLong(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return longDateFormatter.format(date);
}

/**
 * (Opcional) Capitaliza la primera letra de cada palabra
 * útil si quieres: "09 de Julio de 2025"
 */
export function formatDateLongCapitalized(input: Date | string): string {
  const formatted = formatDateLong(input);
  return formatted.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}
