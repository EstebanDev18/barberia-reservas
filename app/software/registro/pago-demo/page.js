"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

// Pasarela simulada: solo existe mientras no hay llaves de Wompi (el backend la rechaza en producción).
export default function DemoCheckout() {
  const [payment, setPayment] = useState(null), [error, setError] = useState("");
  const reference = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("reference");
  useEffect(() => { if (reference) api(`/platform/payments/${reference}`).then((response) => response.json()).then(setPayment).catch(() => setError("Pago no encontrado.")); }, [reference]);
  const pay = async (status) => { const response = await api(`/platform/payments/${reference}/demo`, { method: "POST", body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) return setError(data.message || "No fue posible procesar el pago."); window.location.href = `/software/registro/resultado?reference=${reference}`; };
  return <main className="os-main os-page"><section className="os-result"><p className="eyebrow">Pasarela de prueba</p><h1>Modo <span className="os-mark">demo.</span></h1><p className="os-lead">Aún no hay llaves de Wompi configuradas, así que este paso simula el pago. Con las llaves, aquí aparece el checkout real de Wompi.</p>
    {payment && <div className="summary"><p><span>Barbería</span><strong>{payment.barbershop.name}</strong></p><p><span>Plan</span><strong>{payment.plan} · {payment.period === "YEARLY" ? "Anual" : "Mensual"}</strong></p><p><span>Total</span><strong>{money.format(payment.amountInCents / 100)}</strong></p></div>}
    {error && <p className="form-error">{error}</p>}<div className="actions"><button className="secondary" onClick={() => pay("DECLINED")}>Simular rechazo</button><button className="primary" disabled={!payment} onClick={() => pay("APPROVED")}>Simular pago aprobado <span>→</span></button></div></section></main>;
}
