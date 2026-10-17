"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fields = [["name", "Nombre de la barbería", "Ej. Legacy Barber"], ["ownerName", "Tu nombre", "Ej. Andrés Pérez"], ["email", "Correo", "tu@correo.com"], ["phone", "Celular", "Ej. 300 123 4567"], ["city", "Ciudad", "Ej. Barranquilla"]];

export default function RegisterPage() {
  const [plans, setPlans] = useState([]), [demo, setDemo] = useState(false), [form, setForm] = useState({ name: "", ownerName: "", email: "", phone: "", city: "", plan: "pro", period: "MONTHLY" }), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => {
    // Se lee la URL directamente para no exigir un Suspense alrededor de useSearchParams.
    const params = new URLSearchParams(window.location.search);
    setForm((current) => ({ ...current, plan: params.get("plan") || current.plan, period: params.get("periodo") === "YEARLY" ? "YEARLY" : current.period }));
    api("/platform/plans").then((response) => response.json()).then((data) => { setPlans(data.plans); setDemo(data.demo); }).catch(() => setError("No pudimos cargar los planes."));
  }, []);
  const plan = plans.find((item) => item.id === form.plan);
  const total = plan ? (form.period === "YEARLY" ? plan.yearly : plan.monthly) : 0;
  const submit = async (event) => { event.preventDefault(); setLoading(true); setError(""); const response = await api("/platform/barbershops", { method: "POST", body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) { setLoading(false); return setError(Array.isArray(data.message) ? data.message.join(". ") : data.message || "No fue posible registrar la barbería."); } window.location.href = data.checkoutUrl; };
  return <main className="os-main os-page"><section className="os-register"><div><p className="eyebrow">Registrar mi barbería</p><h1>Activa tu barbería en Barber<b className="os-os">OS</b>.</h1><p className="os-lead">Llena los datos, paga la licencia y tu barbería queda activa apenas se apruebe el pago. Sin licencia activa no es posible ingresar la barbería a BarberOS.</p>
    <form className="os-form" onSubmit={submit}>{fields.map(([key, label, placeholder]) => <label key={key}>{label}<input required minLength="2" type={key === "email" ? "email" : "text"} inputMode={key === "phone" ? "tel" : undefined} placeholder={placeholder} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
      <label>Plan<select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>{plans.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.barbers ? `hasta ${item.barbers} barbero${item.barbers > 1 ? "s" : ""}` : "barberos ilimitados"}</option>)}</select></label>
      <label>Periodo<select value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })}><option value="MONTHLY">Mensual</option><option value="YEARLY">Anual (2 meses gratis)</option></select></label>
      {error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading || !plan}>{loading ? "Preparando el pago…" : `Pagar ${plan ? money.format(total) : ""}`} <span>→</span></button></form></div>
    <aside className="os-summary"><p className="eyebrow">Resumen</p>{plan ? <><h2>Plan {plan.name}</h2><p className="os-price">{money.format(total)}<small>{form.period === "YEARLY" ? "/año" : "/mes"}</small></p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></> : <p>Cargando…</p>}<p className="os-note">El pago se hace en Wompi: tarjeta, PSE, Nequi o Bancolombia.{demo && " Modo demo: sin llaves de Wompi se usa una pasarela de prueba."}</p></aside></section></main>;
}
