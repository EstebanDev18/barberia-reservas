"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "@/lib/api";
import { useOs } from "../../i18n";

const TONES = { APPROVED: "ok", DECLINED: "bad", VOIDED: "bad", ERROR: "bad", PENDING: "wait" };

// Íconos de trazo fino; el de éxito se dibuja al aparecer (stroke-dashoffset) en lugar de confeti.
function StatusIcon({ tone }) {
  if (tone === "wait") return null;
  return <span className={`os-status-ico ${tone}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tone === "ok" ? <path className="os-draw" d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}</svg></span>;
}

export default function PaymentResult() {
  const { t, date } = useOs(), r = t.result;
  const [result, setResult] = useState(null), [error, setError] = useState(""), cardRef = useRef(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Wompi vuelve con ?id=<transacción>; el modo demo con ?reference=. El estado siempre lo confirma el backend.
    const check = () => (params.get("id") ? api("/platform/payments/sync", { method: "POST", body: JSON.stringify({ id: params.get("id") }) }) : api(`/platform/payments/${params.get("reference")}`)).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setResult(data); return data; });
    let tries = 0, timer;
    const poll = () => check().then((data) => { if (data.status === "PENDING" && ++tries < 10) timer = setTimeout(poll, 3000); }).catch((err) => setError(err.message || "failed"));
    poll();
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!result || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(cardRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
  }, [result?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = result?.status || "PENDING";
  // Una renovación pagada desde el panel usa la misma página, con otro texto y sin los pasos de bienvenida.
  const renewal = Boolean(result?.renewal);
  const tone = error ? "bad" : TONES[status] || "wait", title = error ? r.failedTitle : renewal && status === "APPROVED" ? r.renewedTitle : r.titles[status] || r.titles.PENDING;
  const pending = !error && status === "PENDING";
  const shop = result?.barbershop;
  const [name, rest] = shop ? (renewal ? r.renewed : r.registered)(shop.name) : [];
  return <main className="os-center"><section className="os-status-card" ref={cardRef} aria-busy={pending}>
    {pending && <i className="os-pending-bar" aria-hidden="true" />}
    <StatusIcon tone={tone} />
    <p className="os-kicker">{r.kicker}</p>
    <h1>{title}</h1>
    {error ? <><p className="os-muted">{error === "failed" ? r.failed : error}</p><div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href="/#preguntas">{r.faq}</a><a className="os-btn os-btn-dark" href="/registro">{r.backToRegister}</a></div></>
      : pending ? <p className="os-muted">{r.pending}</p>
      : status === "APPROVED" ? <>
        <p className="os-muted"><b>{name}</b>{rest}</p>
        <dl className="os-review">
          <div><dt>{r.plan}</dt><dd>{t.plans[result.plan] || result.plan} · {t.period[result.period]}</dd></div>
          <div><dt>{r.validUntil}</dt><dd>{date(shop.paidUntil, { day: "numeric", month: "long", year: "numeric" })}</dd></div>
          <div><dt>{r.page}</dt><dd className="os-mono">/{shop.slug}</dd></div>
          <div><dt>{r.reference}</dt><dd className="os-mono">{result.reference}</dd></div>
        </dl>
        {!renewal && <ol className="os-next">{r.next.map(([heading, text]) => <li key={heading}><b>{heading}</b><span>{text}</span></li>)}</ol>}
        <div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer">{r.seePage}</a><a className="os-btn os-btn-main" href={`/${shop.slug}/admin`}>{renewal ? r.backToPanel : r.enterPanel} <span className="arrow">→</span></a></div></>
      : <>
        <p className="os-muted">{r.notActivated}</p>
        <dl className="os-review"><div><dt>{r.reference}</dt><dd className="os-mono">{result.reference}</dd></div></dl>
        <div className="os-wiz-actions"><a className="os-btn os-btn-ghost" href="/#precios">{r.seePlans}</a><a className="os-btn os-btn-main" href={renewal && shop ? `/${shop.slug}/admin` : "/registro"}>{renewal ? r.backToPanel : r.retry} <span className="arrow">→</span></a></div></>}
  </section></main>;
}
