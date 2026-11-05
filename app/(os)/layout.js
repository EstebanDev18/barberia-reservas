import { cookies } from "next/headers";
import { CURRENCIES } from "@/lib/money";
import { OsChrome } from "./chrome";
import { OsProvider } from "./i18n";
import { CURRENCY_COOKIE, LANG_COOKIE, LANGS, defaultCurrencyFor } from "./prefs";
import "./barberos.css";

const META = {
  es: { title: "BarberOS | Software de reservas para barberías", description: "Reservas en línea, agenda por barbero y carta de precios para tu barbería." },
  en: { title: "BarberOS | Booking software for barbershops", description: "Online booking, per-barber schedules and a price menu for your barbershop." },
};

// El idioma y la moneda vienen de cookies para que el servidor pinte la página ya en el idioma elegido.
async function preferences() {
  const store = await cookies();
  const lang = LANGS.includes(store.get(LANG_COOKIE)?.value) ? store.get(LANG_COOKIE).value : "es";
  const currency = CURRENCIES.includes(store.get(CURRENCY_COOKIE)?.value) ? store.get(CURRENCY_COOKIE).value : defaultCurrencyFor(lang);
  return { lang, currency };
}

export async function generateMetadata() { return META[(await preferences()).lang]; }

export default async function SoftwareLayout({ children }) {
  const { lang, currency } = await preferences();
  return <OsProvider initialLang={lang} initialCurrency={currency}><OsChrome>{children}</OsChrome></OsProvider>;
}
