// API/form values use a decimal point without grouping. Parse user input
// separately, so display formatting never changes the underlying amount.
export const MAX_MONEY_AMOUNT = 99_999_999.99; // Existing Decimal(10, 2) columns.

export const formatNumber = (value: number | string): string => {
  if (value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: Number.isInteger(number) ? 0 : 2, maximumFractionDigits: 2 }).format(number);
};

// Keep incomplete decimals and trailing zeroes while the user is typing.
export function formatNumberInput(value: string): string {
  if (!value || value === '-') return value;
  if (!/^-?\d*(?:,\d*)?$/.test(value)) return value;
  const [integer, fraction] = value.split(',');
  const grouped = (integer === '-' ? '-0' : integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return grouped + (fraction === undefined ? '' : `,${fraction}`);
}

// A full pasted amount may already have grouping or use an API-style decimal
// point. Reject malformed grouping instead of silently changing its amount.
export function normalizeNumberInput(value: string): string {
  const input = value.trim();
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d*)?$/.test(input)) return input.replaceAll('.', '');
  if (/^-?\d*\.\d{0,2}$/.test(input)) return input.replace('.', ',');
  return input;
}

export type ParsedNumber = { value: number; error?: never } | { error: string; value?: never };

export function parseNumber(value: string, decimalPlaces = 2): ParsedNumber {
  const input = value.trim();
  // Dots group thousands in es-AR. An ungrouped decimal point is also accepted.
  const plain = /^-?\d+(?:[.,]\d+)?$/;
  const grouped = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
  if (!plain.test(input) && !grouped.test(input)) {
    return { error: "Ingresá un número como 1.000 o 1.000,50, sin símbolos de moneda." };
  }
  const canonical = grouped.test(input) ? input.replaceAll(".", "").replace(",", ".") : input.replace(",", ".");
  const fraction = canonical.split(".")[1] || "";
  if (fraction.length > decimalPlaces) {
    return { error: decimalPlaces === 0 ? "Ingresá un número entero." : "Usá coma y hasta dos decimales para los centavos." };
  }
  const number = Number(canonical);
  if (!Number.isFinite(number) || Math.abs(number) > MAX_MONEY_AMOUNT) {
    return { error: "El valor no puede superar 99.999.999,99." };
  }
  return { value: number };
}
