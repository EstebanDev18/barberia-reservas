"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, planName } from "../../widgets";

// Pasarela simulada: solo existe mientras no hay llaves de Wompi (el backend la rechaza en producción).
export default function DemoCheckout() {
  const [payment, setPayment] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [reference, setReference] = useState("");
  useEffect(() => { const ref = new URLSearchParams(window.location.search).get("reference"); setReference(ref); if (ref) api(`/platform/payments/${ref}`).then((response) => response.json()).then(setPayment).catch(() => setError("Pago no encontrado.")); }, []);
  const pay = async (status) => { setBusy(true); const response = await api(`/platform/payments/${reference}/demo`, { method: "POST", body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) { setBusy(false); return setError(data.message || "No fue posible procesar el pago."); } window.location.href = `/registro/resultado?reference=${reference}`; };
  return <main className="os-center"><section className="os-status-card">
    <span className="os-status-ico wait">$</span><p className="os-kicker">Pasarela de prueba</p><h1>Modo demo</h1><p className="os-muted">Aún no hay llaves de Wompi configuradas, así que este paso simula el pago. Con las llaves, aquí aparece el checkout real de Wompi.</p>
    {payment && <dl className="os-review"><div><dt>Barbería</dt><dd>{payment.barbershop.name}</dd></div><div><dt>Plan</dt><dd>{planName(payment.plan)} · {payment.period === "YEARLY" ? "Anual" : "Mensual"}</dd></div><div><dt>Total</dt><dd><b>{money.format(payment.amountInCents / 100)}</b></dd></div></dl>}
    {error && <p className="os-error" role="alert">{error}</p>}
    <div className="os-wiz-actions"><button className="os-btn os-btn-ghost" disabled={busy || !payment} onClick={() => pay("DECLINED")}>Simular rechazo</button><button className="os-btn os-btn-main" disabled={busy || !payment} onClick={() => pay("APPROVED")}>Simular pago aprobado <span className="arrow">→</span></button></div>
  </section></main>;
}
