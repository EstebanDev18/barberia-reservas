"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const paymentLabel = { APPROVED: "aprobado", PENDING: "pendiente", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "con error" };
const license = (shop) => shop.status !== "ACTIVE" ? ["pendiente", "Pendiente de pago"] : new Date(shop.paidUntil) > new Date() ? ["activa", `Activa hasta ${dateLabel(shop.paidUntil)}`] : ["vencida", `Vencida el ${dateLabel(shop.paidUntil)}`];

export default function PlatformAdmin() {
  const [password, setPassword] = useState(""), [shops, setShops] = useState(null), [error, setError] = useState("");
  const login = async (event) => {
    event.preventDefault();
    const response = await api("/platform/login", { method: "POST", body: JSON.stringify({ password }) }); const data = await response.json();
    if (!response.ok) return setError(data.message || "Contraseña incorrecta.");
    const list = await api("/platform/barbershops", { headers: { Authorization: `Bearer ${data.accessToken}` } });
    if (!list.ok) return setError("No fue posible cargar las barberías.");
    setShops(await list.json()); setError("");
  };
  if (!shops) return <main className="os-main os-page"><section className="login-card"><p className="eyebrow">Acceso Barber<b className="os-os">OS</b></p><h1>Panel de la <span className="os-mark">plataforma.</span></h1><p>Barberías registradas, licencias y pagos.</p><form onSubmit={login}><label>Contraseña<input type="password" autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="primary">Entrar <span>→</span></button></form>{error && <p className="form-error">{error}</p>}<small>Se configura con <code>PLATFORM_PASSWORD</code> en <code>backend/.env</code>.</small></section></main>;
  const active = shops.filter((shop) => license(shop)[0] === "activa").length;
  return <main className="os-main os-page"><section className="utility-content os-admin"><p className="eyebrow">Panel Barber<b className="os-os">OS</b></p><h1>Barberías <span className="os-mark">registradas.</span></h1><p className="lead">{shops.length} registradas · {active} con licencia activa</p>
    {shops.length ? <div className="appointment-list">{shops.map((shop) => { const [kind, text] = license(shop), last = shop.payments[0]; return <article className={`appointment-card os-shop ${kind}`} key={shop.id}><div><p className="eyebrow">{text}</p><h3>{shop.name}</h3><p>{shop.ownerName} · {shop.email} · {shop.phone}<br />{shop.city} · plan {shop.plan}{last && <> · último pago {money.format(last.amountInCents / 100)} ({paymentLabel[last.status]})</>}</p></div><code>/{shop.slug}</code></article>; })}</div> : <p className="empty">Todavía no hay barberías registradas.</p>}</section></main>;
}
