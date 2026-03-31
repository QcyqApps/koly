/**
 * Format number as Polish currency (PLN)
 * Example: 1234.56 -> "1 234,56 zl"
 */
export function formatPLN(value: number | string, showDecimals = true): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 zl';

  const formatted = num.toLocaleString('pl-PL', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${formatted} zl`;
}

/**
 * Format number as compact Polish currency
 * Example: 1234 -> "1 234 zl" (no decimals)
 */
export function formatPLNCompact(value: number | string): string {
  return formatPLN(value, false);
}

/**
 * Format percentage
 * Example: 0.1234 -> "12%" or 12.34 -> "12%"
 */
export function formatPercent(value: number, fromDecimal = false): string {
  const percent = fromDecimal ? value * 100 : value;
  return `${percent.toFixed(0)}%`;
}

/**
 * Format date as Polish short date
 * Example: "2026-03-17" -> "17 mar"
 */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

/**
 * Format date as Polish long date
 * Example: "2026-03-17" -> "17 marca 2026"
 */
export function formatLongDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}
