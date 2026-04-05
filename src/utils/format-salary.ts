export function formatSalary(amount: number, currency: string): string {
  const inThousands = (amount / 1000).toFixed(0);
  return `$${inThousands}k ${currency}`;
}
