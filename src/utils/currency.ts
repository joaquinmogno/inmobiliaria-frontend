export type Moneda = "ARS" | "USD";

export const MONEDA_LABELS: Record<Moneda, string> = {
  ARS: "Pesos argentinos",
  USD: "Dólares estadounidenses",
};

function normalizeAmount(amount: number | string | null | undefined): number {
  const numericAmount = Number(amount ?? 0);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
}

export function formatCurrency(amount: number | string | null | undefined, moneda: Moneda = "ARS"): string {
  const numericAmount = normalizeAmount(amount);
  const symbol = moneda === "USD" ? "US$" : "$";
  const sign = numericAmount < 0 ? "-" : "";

  return `${sign}${symbol}${Math.abs(numericAmount).toLocaleString("es-AR", {
    minimumFractionDigits: moneda === "USD" ? 2 : 0,
    maximumFractionDigits: moneda === "USD" ? 2 : 0,
  })}`;
}

export function formatSignedCurrency(
  amount: number | string | null | undefined,
  moneda: Moneda = "ARS",
  showPositiveSign = false,
): string {
  const numericAmount = normalizeAmount(amount);
  const formattedAmount = formatCurrency(numericAmount, moneda);

  return showPositiveSign && numericAmount > 0 ? `+${formattedAmount}` : formattedAmount;
}
