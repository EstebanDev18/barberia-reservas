"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Tween, money } from "../widgets";

const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const paymentLabel = { APPROVED: "aprobado", PENDING: "pendiente", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "con error" };
const license = (shop) => shop.status !== "ACTIVE" ? ["pendiente", "Pendiente de pago"] : new Date(shop.paidUntil) > new Date() ? ["activa", `Activa hasta ${dateLabel(shop.paidUntil)}`] : ["vencida", `Vencida el ${dateLabel(shop.paidUntil)}`];
const filters = [["", "Todas"], ["activa", "Activas"], ["pendiente", "Pendientes"], ["vencida", "Vencidas"]];
const loginFacts = [["Barberías", "Registro y datos de contacto"], ["Licencias", "Activas, pendientes y vencidas"], ["Pagos", "Último cobro de cada una"]];
// Une solo los datos que existen, para no dejar separadores sueltos ("· /slug").
const join = (...parts) => parts.filter(Boolean).reduce((all, part, index) => index ? [...all, " · ", part] : [part], []);

export default function PlatformAdmin() {
  const [password, setPassword] = useState(""), [shops, setShops] = useState(null), [error, setError] = useState(""), [filter, setFilter] = useState(""), [query, setQuery] = useState("");
  const login = async (event) => {
    event.preventDefault();
    const response = await api("/platform/login", { method: "POST", body: JSON.stringify({ password }) }); const data = await response.json();
    if (!response.ok) return setError(data.message || "Contraseña incorrecta.");
    const list = await api("/platform/barbershops", { headers: { Authorization: `Bearer ${data.accessToken}` } });
    if (!list.ok) return setError("No fue posible cargar las barberías.");
    setShops(await list.json()); setError("");
  };
  if (!shops) return <main className="os-login-wrap"><div className="os-login">
    <section className="os-login-brand"><div><p className="os-kicker">Plataforma</p><h1>Panel de la plataforma</h1><p>Todas las barberías que usan el software, el estado de su licencia y su último pago.</p></div>
      <ul>{loginFacts.map(([label, text]) => <li key={label}><span>{label}</span>{text}</li>)}</ul></section>
    <form onSubmit={login}><h2>Iniciar sesión</h2><label className="os-field">Contraseña<span className="os-input"><input type="password" autoFocus required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></span><small className="os-field-help">Se configura con la variable PLATFORM_PASSWORD del servidor.</small>{error && <small role="alert">{error}</small>}</label><button className="os-btn os-btn-dark">Entrar <span className="arrow">→</span></button></form>
  </div></main>;
  const rows = shops.map((shop) => ({ shop, kind: license(shop) }));
  const count = (kind) => rows.filter((row) => row.kind[0] === kind).length;
  const revenue = shops.flatMap((shop) => shop.payments).filter((payment) => payment.status === "APPROVED").reduce((sum, payment) => sum + payment.amountInCents / 100, 0);
  const visible = rows.filter(({ shop, kind }) => (!filter || kind[0] === filter) && `${shop.name} ${shop.ownerName} ${shop.email} ${shop.city}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="os-section os-light os-admin">
    <p className="os-kicker">Plataforma</p><h1>Barberías registradas</h1>
    <div className="os-kpis"><div><span>Registradas</span><b><Tween value={shops.length} /></b></div><div><span>Licencia activa</span><b><Tween value={count("activa")} /></b></div><div><span>Pendientes de pago</span><b><Tween value={count("pendiente")} /></b></div><div><span>Ingresos aprobados</span><b><Tween value={revenue} format={(n) => money.format(n)} /></b></div></div>
    <div className="os-toolbar"><div className="os-seg" role="group" aria-label="Filtrar por licencia">{filters.map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<em>{id ? count(id) : shops.length}</em></button>)}</div><input className="os-search" type="search" placeholder="Buscar barbería, dueño, correo o ciudad" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" /></div>
    <div className="os-table" role="table" aria-label="Barberías"><div className="os-tr os-th" role="row"><span>Barbería</span><span>Responsable</span><span>Plan</span><span>Licencia</span><span>Último pago</span></div>
      {visible.length ? visible.map(({ shop, kind: [kind, text] }) => { const last = shop.payments[0]; return <div className="os-tr" role="row" key={shop.id}><span><b>{shop.name}</b><small>{join(shop.city, <a key="slug" href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer"><u>/{shop.slug}</u></a>)}</small></span><span>{shop.ownerName}<small>{join(shop.email, shop.phone)}</small></span><span className="os-cap">{shop.plan}</span><span><em className={`os-state ${kind}`}>{text}</em></span><span>{last ? <>{money.format(last.amountInCents / 100)}<small>{paymentLabel[last.status]}</small></> : <span className="os-muted">Sin pagos</span>}</span></div>; }) : <div className="os-empty"><b>No hay barberías con ese filtro</b><p>Prueba con otro estado o borra la búsqueda.</p><button type="button" className="os-btn os-btn-ghost" onClick={() => { setFilter(""); setQuery(""); }}>Ver todas</button></div>}</div>
  </main>;
}
