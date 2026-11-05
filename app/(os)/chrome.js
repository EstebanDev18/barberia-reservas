"use client";

import { CURRENCIES } from "@/lib/money";
import { LANGS, useOs } from "./i18n";

// Selectores compactos: idioma (ES/EN) y moneda (COP/USD/EUR).
function Switchers() {
  const { lang, setLang, currency, setCurrency, t } = useOs();
  return <div className="os-prefs">
    <div className="os-lang" role="group" aria-label={t.nav.language}>{LANGS.map((code) => <button type="button" key={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{code.toUpperCase()}</button>)}</div>
    <label className="os-cur"><span className="os-sr">{t.nav.currency}</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}>{CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
  </div>;
}

export function OsChrome({ children }) {
  const { t } = useOs();
  return <div className="os">
    <header className="os-header"><a className="os-logo" href="/">Barber<b>OS</b></a><nav className="os-nav" aria-label="BarberOS"><a href="/#nosotros">{t.nav.about}</a><a href="/#funciones">{t.nav.features}</a><a href="/#precios">{t.nav.pricing}</a><Switchers /><a className="os-btn os-btn-main" href="/registro">{t.nav.register}</a></nav><i className="os-progress" aria-hidden="true" /></header>
    {children}
    <footer className="os-footer">
      <div className="os-footer-grid">
        <div><a className="os-logo" href="/">Barber<b>OS</b></a><p>{t.footer.blurb}</p></div>
        <nav aria-label={t.footer.product}><h3>{t.footer.product}</h3><a href="/#funciones">{t.footer.features}</a><a href="/#demo">{t.footer.demo}</a><a href="/#precios">{t.footer.pricing}</a><a href="/registro">{t.footer.register}</a></nav>
        <nav aria-label={t.footer.company}><h3>{t.footer.company}</h3><a href="/#nosotros">{t.footer.about}</a><a href="/#preguntas">{t.footer.faq}</a><a href="/admin">{t.footer.access}</a></nav>
        <nav aria-label={t.footer.shops}><h3>{t.footer.shops}</h3><a href="/legacy-barber" target="_blank" rel="noopener noreferrer">Legacy Barber ↗</a></nav>
      </div>
      <div className="os-footer-bottom"><span>© {new Date().getFullYear()} BarberOS</span><span className="os-secure"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>{t.footer.secure}</span></div>
    </footer>
  </div>;
}
