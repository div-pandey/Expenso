/**
 * Currency utility for Indian Rupees (₹) and integer paise.
 * 1 Rupee = 100 Paise.
 * Uses Indian number formatting (e.g. ₹1,20,000).
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrNumberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats integer paise into a clean Rupee string (e.g. ₹120, ₹42.50).
 * If showZeroDecimals is false and there are no paise, omits decimals.
 */
export function formatCurrency(paise: number, options?: { showSign?: boolean }): string {
  const rupees = paise / 100;
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);
  
  // Format with INR rules
  const formatted = inrFormatter.format(absRupees);

  if (options?.showSign) {
    if (isNegative) return `-${formatted}`;
    if (rupees > 0) return `+${formatted}`;
  } else if (isNegative) {
    return `-${formatted}`;
  }

  return formatted;
}

/**
 * Formats paise as numeric string without currency symbol (e.g. "120" or "42.50").
 */
export function formatAmountNumber(paise: number): string {
  const rupees = paise / 100;
  return inrNumberFormatter.format(Math.abs(rupees));
}

/**
 * Converts a rupee input string (e.g. "120", "45.50", " ₹ 90 ") into integer paise.
 * Returns null if invalid or <= 0.
 */
export function parseRupeesToPaise(input: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) return null;
  // Round to nearest integer paise to avoid IEEE floating point inaccuracies
  return Math.round(parsed * 100);
}
