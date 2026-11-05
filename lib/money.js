// Formato de dinero por moneda. COP sin decimales (formato colombiano); USD/EUR con decimales solo si los hay.
export const CURRENCIES = ["COP", "USD", "EUR"];
const LOCALE = { COP: { es: "es-CO", en: "es-CO" }, USD: { es: "es-US", en: "en-US" }, EUR: { es: "es-ES", en: "en-IE" } };

export function formatMoney(amount, currency = "COP", lang = "es") {
  const decimals = currency === "COP" || Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(LOCALE[currency]?.[lang] || "es-CO", { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
}
