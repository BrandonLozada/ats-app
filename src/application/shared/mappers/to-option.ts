export function toOption<T extends { id: string; name: string }>(items: T[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.name,
  }));
}
