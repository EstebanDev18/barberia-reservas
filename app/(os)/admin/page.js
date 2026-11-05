"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { CURRENCIES } from "@/lib/money";
import { useOs } from "../i18n";
import { Tween } from "../widgets";

// Une solo los datos que existen, para no dejar separadores sueltos ("· /slug").
const join = (...parts) => parts.filter(Boolean).reduce((all, part, index) => index ? [...all, " · ", part] : [part], []);

export default function PlatformAdmin() {
  const { t, money, date } = useOs(), a = t.admin;
  const [password, setPassword] = useState(""), [shops, setShops] = useState(null), [error, setError] = useState(""), [filter, setFilter] = useState(""), [query, setQuery] = useState("");
  const day = (value) => date(value, { day: "numeric", month: "short", year: "numeric" });
  const license = (shop) => shop.status !== "ACTIVE" ? ["pendiente", a.license.pendiente] : new Date(shop.paidUntil) > new Date() ? ["activa", a.license.activa(day(shop.paidUntil))] : ["vencida", a.license.vencida(day(shop.paidUntil))];
  const login = async (event) => {
    event.preventDefault();
    const response = await api("/platform/login", { method: "POST", body: JSON.stringify({ password }) }); const data = await response.json();
    if (!response.ok) return setError(a.wrong);
    const list = await api("/platform/barbershops", { headers: { Authorization: `Bearer ${data.accessToken}` } });
    if (!list.ok) return setError(a.loadFailed);
    setShops(await list.json()); setError("");
  };
  if (!shops) return <main className="os-login-wrap"><div className="os-login">
    <section className="os-login-brand"><div><p className="os-kicker">{a.kicker}</p><h1>{a.loginTitle}</h1><p>{a.loginLead}</p></div>
      <ul>{a.loginFacts.map(([label, text]) => <li key={label}><span>{label}</span>{text}</li>)}</ul></section>
    <form onSubmit={login}><h2>{a.signIn}</h2><label className="os-field">{a.password}<span className="os-input"><input type="password" autoFocus required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></span><small className="os-field-help">{a.passwordHelp}</small>{error && <small role="alert">{error}</small>}</label><button className="os-btn os-btn-dark">{a.enter} <span className="arrow">→</span></button></form>
  </div></main>;
  const rows = shops.map((shop) => ({ shop, kind: license(shop) }));
  const count = (kind) => rows.filter((row) => row.kind[0] === kind).length;
  // Los ingresos se suman por moneda: no se mezclan pesos con dólares o euros.
  const approved = shops.flatMap((shop) => shop.payments).filter((payment) => payment.status === "APPROVED");
  const revenue = CURRENCIES.map((currency) => [currency, approved.filter((p) => (p.currency || "COP") === currency).reduce((sum, p) => sum + p.amountInCents / 100, 0)]).filter(([currency, amount]) => amount > 0 || currency === "COP");
  const visible = rows.filter(({ shop, kind }) => (!filter || kind[0] === filter) && `${shop.name} ${shop.ownerName} ${shop.email} ${shop.city}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="os-section os-light os-admin">
    <p className="os-kicker">{a.kicker}</p><h1>{a.title}</h1>
    <div className="os-kpis"><div><span>{a.kpis[0]}</span><b><Tween value={shops.length} /></b></div><div><span>{a.kpis[1]}</span><b><Tween value={count("activa")} /></b></div><div><span>{a.kpis[2]}</span><b><Tween value={count("pendiente")} /></b></div><div><span>{a.kpis[3]}</span>{revenue.map(([currency, amount]) => <b key={currency} className="os-kpi-money">{money(amount, currency)}{revenue.length > 1 && <small>{currency}</small>}</b>)}</div></div>
    <div className="os-toolbar"><div className="os-seg" role="group" aria-label={a.filterLabel}>{a.filters.map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<em>{id ? count(id) : shops.length}</em></button>)}</div><input className="os-search" type="search" placeholder={a.search} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={a.searchLabel} /></div>
    <div className="os-table" role="table" aria-label={a.title}><div className="os-tr os-th" role="row">{a.columns.map((column) => <span key={column}>{column}</span>)}</div>
      {visible.length ? visible.map(({ shop, kind: [kind, text] }) => { const last = shop.payments[0]; return <div className="os-tr" role="row" key={shop.id}><span><b>{shop.name}</b><small>{join(shop.city, <a key="slug" href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer"><u>/{shop.slug}</u></a>)}</small></span><span>{shop.ownerName}<small>{join(shop.email, shop.phone)}</small></span><span>{t.plans[shop.plan] || shop.plan}<small>{shop.currency}</small></span><span><em className={`os-state ${kind}`}>{text}</em></span><span>{last ? <>{money(last.amountInCents / 100, last.currency || "COP")}<small>{a.payment[last.status]}</small></> : <span className="os-muted">{a.noPayments}</span>}</span></div>; }) : <div className="os-empty"><b>{a.emptyTitle}</b><p>{a.emptyLead}</p><button type="button" className="os-btn os-btn-ghost" onClick={() => { setFilter(""); setQuery(""); }}>{a.seeAll}</button></div>}</div>
  </main>;
}
