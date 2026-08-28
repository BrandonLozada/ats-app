export function diffFields(oldData: any, newData: any) {
  const changes: Record<string, { before: any; after: any }> = {};

  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        before: oldData[key],
        after: newData[key],
      };
    }
  }

  return changes;
}
