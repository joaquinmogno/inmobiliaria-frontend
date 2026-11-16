// API/form values use a decimal point without grouping. Parse user input
// separately, so display formatting never changes the underlying amount.
export const MAX_MONEY_AMOUNT = 99_999_999.99; // Existing Decimal(10, 2) columns.

export const formatNumber = (value: number | string): string => {
  if (value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: Number.isInteger(number) ? 0 : 2, maximumFractionDigits: 2 }).format(number);
};

export const editableNumber = (value: number | string): string =>
  value === "" ? "" : String(value).replace(".", ",");

export type ParsedNumber = { value: number; error?: never } | { error: string; value?: never };

export function parseNumber(value: string, decimalPlaces = 2): ParsedNumber {
  const input = value.trim();
  // A lone 1.000 could mean one or one thousand: require 1000 or 1.000,00.
  const plain = /^-?\d+(?:[.,]\d+)?$/;
  const grouped = /^-?\d{1,3}(?:\.\d{3})+,\d+$/;
  if (!plain.test(input) && !grouped.test(input)) {
    return { error: "Ingresá un número como 1000,50 o 1.000,50, sin símbolos de moneda." };
  }
  const canonical = grouped.test(input) ? input.replaceAll(".", "").replace(",", ".") : input.replace(",", ".");
  const fraction = canonical.split(".")[1] || "";
  if (fraction.length > decimalPlaces) {
    return { error: decimalPlaces === 0 ? "Ingresá un número entero." : "Usá hasta dos decimales. Para mil, escribí 1000 o 1.000,00." };
  }
  const number = Number(canonical);
  if (!Number.isFinite(number) || Math.abs(number) > MAX_MONEY_AMOUNT) {
    return { error: "El valor no puede superar 99.999.999,99." };
  }
  return { value: number };
}
