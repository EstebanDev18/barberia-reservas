"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, planName } from "../../widgets";

// Pasarela simulada: solo existe mientras no hay llaves de Wompi (el backend la rechaza en producción).
export default function DemoCheckout() {
  const [payment, setPayment] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(""), [reference, setReference] = useState("");
  useEffect(() => { const ref = new URLSearchParams(window.location.search).get("reference"); setReference(ref); if (ref) api(`/platform/payments/${ref}`).then((response) => response.ok ? response.json() : Promise.reject()).then(setPayment).catch(() => setError("No encontramos ese pago. Vuelve al registro e inténtalo de nuevo.")); else setError("Falta la referencia del pago."); }, []);
  const pay = async (status) => { setBusy(status); setError(""); const response = await api(`/platform/payments/${reference}/demo`, { method: "POST", body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) { setBusy(""); return setError(data.message || "No fue posible procesar el pago."); } window.location.href = `/registro/resultado?reference=${reference}`; };
  return <main className="os-center"><section className="os-status-card">
    <span className="os-demo-tag">Modo demo</span>
    <p className="os-kicker">Pasarela de prueba</p>
    <h1>Simula el pago</h1>
    <p className="os-muted">Todavía no hay llaves de Wompi configuradas, así que este paso reemplaza el checkout real. No se cobra nada.</p>
    {payment ? <dl className="os-review">
      <div><dt>Barbería</dt><dd>{payment.barbershop.name}</dd></div>
      <div><dt>Plan</dt><dd>{planName(payment.plan)} · {payment.period === "YEARLY" ? "Anual" : "Mensual"}</dd></div>
      <div><dt>Referencia</dt><dd className="os-mono">{reference}</dd></div>
      <div className="os-review-total"><dt>Total</dt><dd>{money.format(payment.amountInCents / 100)}</dd></div>
    </dl> : !error && <div className="os-skeleton" aria-hidden="true"><i /><i /><i /></div>}
    {error && <p className="os-error" role="alert">{error}</p>}
    <div className="os-wiz-actions"><button className="os-btn os-btn-ghost" disabled={Boolean(busy) || !payment} onClick={() => pay("DECLINED")}>{busy === "DECLINED" ? "Procesando…" : "Simular rechazo"}</button><button className="os-btn os-btn-main" disabled={Boolean(busy) || !payment} onClick={() => pay("APPROVED")}>{busy === "APPROVED" ? "Procesando…" : "Simular pago aprobado"} <span className="arrow">→</span></button></div>
  </section></main>;
}
