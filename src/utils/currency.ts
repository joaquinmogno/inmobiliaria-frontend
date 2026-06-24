export type Moneda = "ARS" | "USD";

export const MONEDA_LABELS: Record<Moneda, string> = {
  ARS: "Pesos argentinos",
  USD: "Dólares estadounidenses",
};

export function formatCurrency(amount: number | string | null | undefined, moneda: Moneda = "ARS"): string {
  const numericAmount = Number(amount || 0);
  const symbol = moneda === "USD" ? "US$" : "$";

  return `${symbol}${numericAmount.toLocaleString("es-AR", {
    minimumFractionDigits: moneda === "USD" ? 2 : 0,
    maximumFractionDigits: moneda === "USD" ? 2 : 0,
  })}`;
}
