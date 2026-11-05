"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "@/lib/api";
import { planName } from "../../widgets";

const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
const messages = { APPROVED: ["ok", "Tu barbería ya está activa"], DECLINED: ["bad", "El pago no pasó"], VOIDED: ["bad", "El pago fue anulado"], ERROR: ["bad", "Algo falló con el pago"], PENDING: ["wait", "Confirmando tu pago"] };

// Íconos de trazo fino; el de éxito se dibuja al aparecer (stroke-dashoffset) en lugar de confeti.
function StatusIcon({ tone }) {
  if (tone === "wait") return null;
  return <span className={`os-status-ico ${tone}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tone === "ok" ? <path className="os-draw" d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}</svg></span>;
}

export default function PaymentResult() {
  const [result, setResult] = useState(null), [error, setError] = useState(""), cardRef = useRef(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Wompi vuelve con ?id=<transacción>; el modo demo con ?reference=. El estado siempre lo confirma el backend.
    const check = () => (params.get("id") ? api("/platform/payments/sync", { method: "POST", body: JSON.stringify({ id: params.get("id") }) }) : api(`/platform/payments/${params.get("reference")}`)).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setResult(data); return data; });
    let tries = 0, timer;
    const poll = () => check().then((data) => { if (data.status === "PENDING" && ++tries < 10) timer = setTimeout(poll, 3000); }).catch((err) => setError(err.message || "No pudimos confirmar el pago."));
    poll();
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!result || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(cardRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
  }, [result?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tone, title] = error ? ["bad", "No pudimos confirmar el pago"] : messages[result?.status] || messages.PENDING;
  const pending = !error && (!result || result.status === "PENDING");
  const shop = result?.barbershop;
  return <main className="os-center"><section className="os-status-card" ref={cardRef} aria-busy={pending}>
    {pending && <i className="os-pending-bar" aria-hidden="true" />}
    <StatusIcon tone={tone} />
    <p className="os-kicker">Registro · Pago</p>
    <h1>{title}</h1>
    {error ? <><p className="os-muted">{error}</p><div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href="/#preguntas">Ver preguntas frecuentes</a><a className="os-btn os-btn-dark" href="/registro">Volver al registro</a></div></>
      : pending ? <p className="os-muted">Estamos confirmando la transacción con la pasarela de pago. Puede tardar unos segundos; no cierres esta página.</p>
      : result.status === "APPROVED" ? <>
        <p className="os-muted"><b>{shop.name}</b> quedó registrada y lista para recibir reservas.</p>
        <dl className="os-review">
          <div><dt>Plan</dt><dd>{planName(result.plan)} · {result.period === "YEARLY" ? "Anual" : "Mensual"}</dd></div>
          <div><dt>Licencia vigente hasta</dt><dd>{dateLabel(shop.paidUntil)}</dd></div>
          <div><dt>Tu página</dt><dd className="os-mono">/{shop.slug}</dd></div>
          <div><dt>Referencia</dt><dd className="os-mono">{result.reference}</dd></div>
        </dl>
        <ol className="os-next">
          <li><b>Entra a tu panel</b><span>Con la contraseña que creaste en el registro.</span></li>
          <li><b>Arma tu carta y tu equipo</b><span>Servicios, precios, barberos y horarios.</span></li>
          <li><b>Comparte tu link</b><span>En Instagram, WhatsApp o en un código QR en la barbería.</span></li>
        </ol>
        <div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer">Ver mi página ↗</a><a className="os-btn os-btn-main" href={`/${shop.slug}/admin`}>Entrar a mi panel <span className="arrow">→</span></a></div></>
      : <>
        <p className="os-muted">Tu barbería no se activó porque el pago no se aprobó. No se te cobró nada; puedes intentarlo de nuevo con otro medio de pago.</p>
        <dl className="os-review"><div><dt>Referencia</dt><dd className="os-mono">{result.reference}</dd></div></dl>
        <div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href="/#precios">Ver planes</a><a className="os-btn os-btn-main" href="/registro">Intentar de nuevo <span className="arrow">→</span></a></div></>}
  </section></main>;
}
