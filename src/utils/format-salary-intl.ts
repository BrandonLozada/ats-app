export function formatSalaryIntl(
  amount: number,
  currency: string,
  locale: string = "es-MX",
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(amount);
}
