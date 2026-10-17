"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Tween, money } from "../widgets";

const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const paymentLabel = { APPROVED: "aprobado", PENDING: "pendiente", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "con error" };
const license = (shop) => shop.status !== "ACTIVE" ? ["pendiente", "Pendiente de pago"] : new Date(shop.paidUntil) > new Date() ? ["activa", `Activa hasta ${dateLabel(shop.paidUntil)}`] : ["vencida", `Vencida el ${dateLabel(shop.paidUntil)}`];
const filters = [["", "Todas"], ["activa", "Activas"], ["pendiente", "Pendientes"], ["vencida", "Vencidas"]];

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
  if (!shops) return <main className="os-center"><form className="os-status-card" onSubmit={login}><span className="os-status-ico wait">OS</span><p className="os-kicker">Acceso BarberOS</p><h1>Panel de la plataforma</h1><p className="os-muted">Barberías registradas, licencias y pagos.</p><label className="os-field">Contraseña<span className="os-input"><input type="password" autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} /></span></label>{error && <p className="os-error" role="alert">{error}</p>}<div className="os-wiz-actions"><span className="os-muted" style={{ fontSize: 13 }}>Se configura con PLATFORM_PASSWORD.</span><button className="os-btn os-btn-main">Entrar <span className="arrow">→</span></button></div></form></main>;
  const rows = shops.map((shop) => ({ shop, kind: license(shop) }));
  const count = (kind) => rows.filter((row) => row.kind[0] === kind).length;
  const revenue = shops.flatMap((shop) => shop.payments).filter((payment) => payment.status === "APPROVED").reduce((sum, payment) => sum + payment.amountInCents / 100, 0);
  const visible = rows.filter(({ shop, kind }) => (!filter || kind[0] === filter) && `${shop.name} ${shop.ownerName} ${shop.email} ${shop.city}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="os-section os-light os-admin">
    <p className="os-kicker">Panel BarberOS</p><h1>Barberías registradas</h1>
    <div className="os-kpis"><div><span>Registradas</span><b><Tween value={shops.length} /></b></div><div><span>Con licencia activa</span><b><Tween value={count("activa")} /></b></div><div><span>Pendientes de pago</span><b><Tween value={count("pendiente")} /></b></div><div><span>Ingresos aprobados</span><b><Tween value={revenue} format={(n) => money.format(n)} /></b></div></div>
    <div className="os-toolbar"><div className="os-pills">{filters.map(([id, label]) => <button type="button" key={id} className={`os-pill ${filter === id ? "sel" : ""}`} onClick={() => setFilter(id)}>{label}</button>)}</div><input className="os-search" type="search" placeholder="Buscar barbería, dueño, correo o ciudad" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" /></div>
    <div className="os-table" role="table" aria-label="Barberías"><div className="os-tr os-th" role="row"><span>Barbería</span><span>Responsable</span><span>Plan</span><span>Licencia</span><span>Último pago</span></div>
      {visible.length ? visible.map(({ shop, kind: [kind, text] }) => { const last = shop.payments[0]; return <div className="os-tr" role="row" key={shop.id}><span><b>{shop.name}</b><small>{shop.city} · <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer"><u>/{shop.slug}</u></a></small></span><span>{shop.ownerName}<small>{shop.email} · {shop.phone}</small></span><span className="os-cap">{shop.plan}</span><span><em className={`os-state ${kind}`}>{text}</em></span><span>{last ? <>{money.format(last.amountInCents / 100)}<small>{paymentLabel[last.status]}</small></> : "—"}</span></div>; }) : <p className="os-muted" style={{ padding: 20 }}>No hay barberías con ese filtro.</p>}</div>
  </main>;
}
