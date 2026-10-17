"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const dateLabel = (value) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
const messages = { APPROVED: ["Pago aprobado", "¡Tu barbería ya está activa!"], DECLINED: ["Pago rechazado", "El pago no pasó."], VOIDED: ["Pago anulado", "El pago fue anulado."], ERROR: ["Error en el pago", "Algo falló con el pago."], PENDING: ["Pago en proceso", "Estamos esperando la confirmación."] };

export default function PaymentResult() {
  const [result, setResult] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Wompi vuelve con ?id=<transacción>; el modo demo con ?reference=. El estado siempre lo confirma el backend.
    const check = () => (params.get("id") ? api("/platform/payments/sync", { method: "POST", body: JSON.stringify({ id: params.get("id") }) }) : api(`/platform/payments/${params.get("reference")}`)).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setResult(data); return data; });
    let tries = 0, timer;
    const poll = () => check().then((data) => { if (data.status === "PENDING" && ++tries < 10) timer = setTimeout(poll, 3000); }).catch((err) => setError(err.message || "No pudimos confirmar el pago."));
    poll();
    return () => clearTimeout(timer);
  }, []);
  const [label, title] = messages[result?.status] || messages.PENDING;
  return <main className="os-main os-page"><section className="os-result"><p className="eyebrow">{label}</p><h1>{title}</h1>
    {error ? <p className="form-error">{error}</p> : !result ? <p className="os-lead">Confirmando tu pago…</p> : result.status === "APPROVED" ? <><p className="os-lead"><strong>{result.barbershop.name}</strong> quedó registrada en BarberOS con el plan {result.plan}. Tu licencia está vigente hasta el <strong>{dateLabel(result.barbershop.paidUntil)}</strong>.</p><p className="os-note">Te escribiremos al correo registrado con los siguientes pasos para configurar tu equipo y tu carta.</p></> : result.status === "PENDING" ? <p className="os-lead">Esto puede tardar unos segundos. No cierres esta página.</p> : <><p className="os-lead">Tu barbería no se activó porque el pago no se aprobó. Puedes intentarlo de nuevo.</p><a className="primary" href="/software/registro">Intentar de nuevo <span>→</span></a></>}
  </section></main>;
}
