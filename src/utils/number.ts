export const formatNumber = (value: number | string): string => {
  if (value === "" || value === undefined || value === null) return "";
  
  // Remove any non-digit character except for potential comma (decimal separator)
  const stringValue = value.toString().replace(/[^0-9]/g, "");
  
  if (stringValue === "") return "";
  
  // Use Intl.NumberFormat for locale-aware formatting (Spanish-Argentina uses . for thousands)
  return new Intl.NumberFormat("es-AR").format(parseInt(stringValue, 10));
};

export const parseNumber = (value: string): number => {
  if (!value) return 0;
  // Remove all non-digit characters
  const cleanValue = value.replace(/[^0-9]/g, "");
  return parseInt(cleanValue, 10) || 0;
};
