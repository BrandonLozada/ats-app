/**
 * Convierte cualquier enum de Prisma en un array de { value, label }
 * @param enumObj El enum importado de @prisma/client
 * @param labels Opcional: diccionario de labels amigables
 */
export function enumToOptions<T extends Record<string, string>>(
  enumObj: T,
  labels?: Record<string, string>,
): {
  value: string;
  label: string;
}[] {
  return Object.values(enumObj).map((val) => ({
    value: val,
    label: labels?.[val] ?? val.replace("_", " "),
  }));
}
