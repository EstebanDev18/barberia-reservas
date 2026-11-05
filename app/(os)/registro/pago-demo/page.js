"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useOs } from "../../i18n";

// Pasarela simulada: solo existe mientras la pasarela de la moneda no tiene llaves (el backend la rechaza en producción).
export default function DemoCheckout() {
  const { t, money } = useOs(), d = t.demoPay;
  const [payment, setPayment] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(""), [reference, setReference] = useState("");
  useEffect(() => { const ref = new URLSearchParams(window.location.search).get("reference"); setReference(ref); if (ref) api(`/platform/payments/${ref}`).then((response) => response.ok ? response.json() : Promise.reject()).then(setPayment).catch(() => setError("notFound")); else setError("missing"); }, []);
  const pay = async (status) => { setBusy(status); setError(""); const response = await api(`/platform/payments/${reference}/demo`, { method: "POST", body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) { setBusy(""); return setError(data.message || "failed"); } window.location.href = `/registro/resultado?reference=${reference}`; };
  return <main className="os-center"><section className="os-status-card">
    <span className="os-demo-tag">{d.tag}</span>
    <p className="os-kicker">{d.kicker}</p>
    <h1>{d.title}</h1>
    <p className="os-muted">{d.lead}</p>
    {payment ? <dl className="os-review">
      <div><dt>{d.shop}</dt><dd>{payment.barbershop.name}</dd></div>
      <div><dt>{d.plan}</dt><dd>{t.plans[payment.plan] || payment.plan} · {t.period[payment.period]}</dd></div>
      <div><dt>{d.reference}</dt><dd className="os-mono">{reference}</dd></div>
      <div className="os-review-total"><dt>{d.total}</dt><dd>{money(payment.amountInCents / 100, payment.currency || "COP")}</dd></div>
    </dl> : !error && <div className="os-skeleton" aria-hidden="true"><i /><i /><i /></div>}
    {error && <p className="os-error" role="alert">{d[error] || error}</p>}
    <div className="os-wiz-actions"><button className="os-btn os-btn-ghost" disabled={Boolean(busy) || !payment} onClick={() => pay("DECLINED")}>{busy === "DECLINED" ? d.processing : d.decline}</button><button className="os-btn os-btn-main" disabled={Boolean(busy) || !payment} onClick={() => pay("APPROVED")}>{busy === "APPROVED" ? d.processing : d.approve} <span className="arrow">→</span></button></div>
  </section></main>;
}
