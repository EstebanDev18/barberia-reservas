"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "@/lib/api";
import { planName } from "../../widgets";

const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
const messages = { APPROVED: ["✓", "ok", "¡Tu barbería ya está activa!"], DECLINED: ["✕", "bad", "El pago no pasó"], VOIDED: ["✕", "bad", "El pago fue anulado"], ERROR: ["!", "bad", "Algo falló con el pago"], PENDING: ["", "wait", "Confirmando tu pago…"] };

// Confeti al aprobar el pago: piezas de colores de la marca que caen con GSAP.
function confetti(host) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#c6f24e", "#ff5b3a", "#0e1116", "#ffffff"];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("i");
    piece.className = "os-confetti";
    piece.style.background = colors[i % colors.length];
    host.appendChild(piece);
    gsap.fromTo(piece, { x: 0, y: 0, rotate: 0, opacity: 1 }, { x: gsap.utils.random(-420, 420), y: gsap.utils.random(-320, 260), rotate: gsap.utils.random(-540, 540), opacity: 0, duration: gsap.utils.random(1.2, 2.2), ease: "power2.out", onComplete: () => piece.remove() });
  }
}

export default function PaymentResult() {
  const [result, setResult] = useState(null), [error, setError] = useState(""), cardRef = useRef(null), burst = useRef(null);
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
    if (!result) return;
    gsap.fromTo(cardRef.current, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)" });
    if (result.status === "APPROVED") confetti(burst.current);
  }, [result?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [icon, tone, title] = error ? ["!", "bad", "No pudimos confirmar el pago"] : messages[result?.status] || messages.PENDING;
  return <main className="os-center"><div className="os-burst" ref={burst} aria-hidden="true" /><section className="os-status-card" ref={cardRef}>
    <span className={`os-status-ico ${tone}`}>{icon}</span><h1>{title}</h1>
    {error ? <><p className="os-muted">{error}</p><a className="os-btn os-btn-dark" href="/registro">Volver al registro</a></> : !result || result.status === "PENDING" ? <p className="os-muted">Esto puede tardar unos segundos. No cierres esta página.</p> : result.status === "APPROVED" ? <>
      <p className="os-muted"><b>{result.barbershop.name}</b> quedó registrada en BarberOS.</p>
      <dl className="os-review"><div><dt>Plan</dt><dd>{planName(result.plan)} · {result.period === "YEARLY" ? "Anual" : "Mensual"}</dd></div><div><dt>Licencia vigente hasta</dt><dd>{dateLabel(result.barbershop.paidUntil)}</dd></div><div><dt>Referencia</dt><dd className="os-mono">{result.reference}</dd></div></dl>
      <p className="os-muted">Entra a tu panel con la contraseña que creaste: ahí agregas tu equipo, tu carta y eliges cómo se ve tu página.</p><dl className="os-review"><div><dt>Tu página</dt><dd className="os-mono">/{result.barbershop.slug}</dd></div></dl><div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href={`/${result.barbershop.slug}`} target="_blank" rel="noopener noreferrer">Ver mi página ↗</a><a className="os-btn os-btn-main" href={`/${result.barbershop.slug}/admin`}>Entrar a mi panel <span className="arrow">→</span></a></div></> : <>
      <p className="os-muted">Tu barbería no se activó porque el pago no se aprobó. No se te cobró nada; puedes intentarlo de nuevo.</p><a className="os-btn os-btn-main" href="/registro">Intentar de nuevo <span className="arrow">→</span></a></>}
  </section></main>;
}
