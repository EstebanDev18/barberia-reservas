// Constantes de idioma y moneda compartidas por el servidor (layout) y el cliente (i18n.js).
// Van en un módulo aparte porque lo que exporta un archivo "use client" no se puede leer como valor en el servidor.
export const LANGS = ["es", "en"];
export const LANG_COOKIE = "bos_lang";
export const CURRENCY_COOKIE = "bos_currency";
export const defaultCurrencyFor = (lang) => (lang === "en" ? "USD" : "COP");
