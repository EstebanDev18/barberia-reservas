"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "@/lib/api";
import { Tween, money } from "../widgets";

const steps = ["Plan", "Tu barbería", "Revisar y pagar"];
const fields = [["name", "Nombre de la barbería", "Ej. Legacy Barber"], ["ownerName", "Tu nombre", "Ej. Andrés Pérez"], ["email", "Correo", "tu@correo.com"], ["phone", "Celular", "Ej. 300 123 4567"], ["city", "Ciudad", "Ej. Barranquilla"]];
// Mismas reglas que valida el backend, para avisar antes de enviar.
const rules = { name: (v) => v.trim().length >= 2, ownerName: (v) => v.trim().length >= 2, email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), phone: (v) => v.replace(/\D/g, "").length >= 7, city: (v) => v.trim().length >= 2 };
const hints = { name: "Escribe el nombre de tu barbería.", ownerName: "Escribe tu nombre.", email: "Revisa el correo, parece incompleto.", phone: "El celular debe tener al menos 7 números.", city: "¿En qué ciudad está?" };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RegisterPage() {
  const [plans, setPlans] = useState([]), [demo, setDemo] = useState(false), [step, setStep] = useState(0), [touched, setTouched] = useState({}), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ plan: "pro", period: "MONTHLY", name: "", ownerName: "", email: "", phone: "", city: "" });
  const panelRef = useRef(null), barRef = useRef(null), direction = useRef(1);
  useEffect(() => {
    // Se lee la URL directamente para no exigir un Suspense alrededor de useSearchParams.
    const params = new URLSearchParams(window.location.search);
    setForm((current) => ({ ...current, plan: params.get("plan") || current.plan, period: params.get("periodo") === "YEARLY" ? "YEARLY" : current.period }));
    api("/platform/plans").then((response) => response.json()).then((data) => { setPlans(data.plans); setDemo(data.demo); }).catch(() => setError("No pudimos cargar los planes. Revisa tu conexión."));
  }, []);
  useEffect(() => {
    gsap.to(barRef.current, { scaleX: step / (steps.length - 1), duration: 0.6, ease: "power3.out" });
    gsap.fromTo(panelRef.current, { x: reduced() ? 0 : direction.current * 46, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    panelRef.current?.querySelector("input,button")?.focus({ preventScroll: true });
  }, [step]);
  const plan = plans.find((item) => item.id === form.plan);
  const total = plan ? (form.period === "YEARLY" ? plan.yearly : plan.monthly) : 0;
  const invalid = fields.map(([key]) => key).filter((key) => !rules[key](form[key]));
  const go = (next) => { direction.current = next > step ? 1 : -1; setError(""); setStep(next); };
  const next = (event) => { event.preventDefault(); if (step === 1 && invalid.length) return setTouched(Object.fromEntries(fields.map(([key]) => [key, true]))); if (step < 2) return go(step + 1); pay(); };
  const pay = async () => { setLoading(true); setError(""); const response = await api("/platform/barbershops", { method: "POST", body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) { setLoading(false); return setError(Array.isArray(data.message) ? data.message.join(". ") : data.message || "No fue posible registrar la barbería."); } window.location.href = data.checkoutUrl; };
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return <main className="os-reg">
    <section className="os-wizard">
      <p className="os-kicker">Registrar mi barbería</p><h1>Activa tu barbería en minutos.</h1>
      <ol className="os-stepper" aria-label="Pasos del registro"><i className="os-stepper-bar"><i ref={barRef} /></i>{steps.map((label, index) => <li key={label} className={index < step ? "done" : index === step ? "on" : ""} aria-current={index === step ? "step" : undefined}><button type="button" disabled={index > step} onClick={() => go(index)}><b>{index < step ? "✓" : index + 1}</b>{label}</button></li>)}</ol>
      <form className="os-wiz-card" onSubmit={next} noValidate><div ref={panelRef}>
        {step === 0 && <><h2>Elige tu plan</h2><p className="os-muted">Puedes empezar con uno y cambiar cuando tu equipo crezca.</p>
          <div className={`os-switch ${form.period === "YEARLY" ? "yearly" : ""}`} role="group" aria-label="Periodo de pago"><i className="knob" /><button type="button" aria-pressed={form.period === "MONTHLY"} onClick={() => setForm({ ...form, period: "MONTHLY" })}>Mensual</button><button type="button" aria-pressed={form.period === "YEARLY"} onClick={() => setForm({ ...form, period: "YEARLY" })}>Anual <em>−2 meses</em></button></div>
          <div className="os-pick" role="radiogroup" aria-label="Plan">{plans.map((item) => <label key={item.id} className={`os-pick-card ${form.plan === item.id ? "sel" : ""}`}><input type="radio" name="plan" value={item.id} checked={form.plan === item.id} onChange={set("plan")} /><span className="os-pick-top"><b>{item.name}</b>{item.id === "pro" && <em>Recomendado</em>}</span><span className="os-pick-price">{money.format(form.period === "YEARLY" ? item.yearly : item.monthly)}<small>{form.period === "YEARLY" ? "/año" : "/mes"}</small></span><span className="os-muted">{item.barbers ? `Hasta ${item.barbers} barbero${item.barbers > 1 ? "s" : ""}` : "Barberos ilimitados"}</span></label>)}</div></>}
        {step === 1 && <><h2>Cuéntanos de tu barbería</h2><p className="os-muted">Con estos datos registramos tu barbería en BarberOS.</p>
          <div className="os-fields">{fields.map(([key, label, placeholder]) => { const bad = touched[key] && !rules[key](form[key]), ok = form[key] && rules[key](form[key]); return <label key={key} className={`os-field ${bad ? "bad" : ok ? "ok" : ""}`}>{label}<span className="os-input"><input type={key === "email" ? "email" : "text"} inputMode={key === "phone" ? "tel" : undefined} autoComplete={{ email: "email", phone: "tel", ownerName: "name", city: "address-level2", name: "organization" }[key]} placeholder={placeholder} value={form[key]} onChange={set(key)} onBlur={() => setTouched({ ...touched, [key]: true })} aria-invalid={bad} /><i aria-hidden="true">{ok ? "✓" : ""}</i></span>{bad && <small>{hints[key]}</small>}</label>; })}</div></>}
        {step === 2 && <><h2>Revisa y paga</h2><p className="os-muted">Al pagar te llevamos a Wompi. Apenas se apruebe, tu barbería queda activa.</p>
          <dl className="os-review"><div><dt>Plan</dt><dd>{plan?.name} · {form.period === "YEARLY" ? "Anual" : "Mensual"}</dd><button type="button" onClick={() => go(0)}>Cambiar</button></div><div><dt>Barbería</dt><dd>{form.name} · {form.city}</dd><button type="button" onClick={() => go(1)}>Editar</button></div><div><dt>Responsable</dt><dd>{form.ownerName} · {form.email} · {form.phone}</dd><button type="button" onClick={() => go(1)}>Editar</button></div></dl>
          <div className="os-methods" aria-label="Medios de pago"><span>Tarjeta</span><span>PSE</span><span>Nequi</span><span>Bancolombia</span></div>
          {demo && <p className="os-demo-note">Modo demo: aún no hay llaves de Wompi, así que el pago se simula.</p>}</>}
        {error && <p className="os-error" role="alert">{error}</p>}
        <div className="os-wiz-actions">{step > 0 ? <button type="button" className="os-btn os-btn-ghost" onClick={() => go(step - 1)}>← Atrás</button> : <a className="os-btn os-btn-ghost" href="/software#precios">Ver precios</a>}<button className="os-btn os-btn-main" disabled={!plan || loading}>{step < 2 ? "Continuar" : loading ? "Conectando con Wompi…" : `Pagar ${money.format(total)}`} <span className="arrow">→</span></button></div>
      </div></form>
    </section>
    <aside className="os-side"><p className="os-side-label">Tu plan</p><h2>{plan ? plan.name : "…"}</h2><p className="os-side-price">{plan ? <Tween value={total} format={(n) => money.format(n)} /> : "…"}<small>{form.period === "YEARLY" ? "/año" : "/mes"}</small></p>{form.period === "YEARLY" && plan && <p className="os-side-save">Ahorras {money.format(plan.monthly * 2)} frente a pagar mes a mes</p>}
      <ul>{plan?.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <div className="os-trust"><p><b>🔒 Pago seguro</b>Procesado por Wompi (Bancolombia). No guardamos datos de tu tarjeta.</p><p><b>⚡ Activación inmediata</b>Tu barbería queda activa apenas se apruebe el pago.</p><p><b>↺ Sin permanencia</b>Pagas por periodo y renuevas cuando quieras.</p></div></aside>
  </main>;
}
