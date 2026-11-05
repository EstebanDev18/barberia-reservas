"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "@/lib/api";
import { CURRENCIES } from "@/lib/money";
import { useOs } from "../i18n";
import { Tween } from "../widgets";

const FIELDS = ["name", "ownerName", "email", "phone", "city", "password"];
// Mismas reglas que valida el backend, para avisar antes de enviar.
const rules = { name: (v) => v.trim().length >= 2, ownerName: (v) => v.trim().length >= 2, email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), phone: (v) => v.replace(/\D/g, "").length >= 7, city: (v) => v.trim().length >= 2, password: (v) => v.length >= 8 };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RegisterPage() {
  const { t, lang, currency, setCurrency, money } = useOs(), r = t.register;
  const [plans, setPlans] = useState([]), [demo, setDemo] = useState({}), [step, setStep] = useState(0), [touched, setTouched] = useState({}), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ plan: "pro", period: "MONTHLY", name: "", ownerName: "", email: "", phone: "", city: "", password: "" });
  const panelRef = useRef(null), barRef = useRef(null), direction = useRef(1);
  useEffect(() => {
    // Se lee la URL directamente para no exigir un Suspense alrededor de useSearchParams.
    const params = new URLSearchParams(window.location.search);
    setForm((current) => ({ ...current, plan: params.get("plan") || current.plan, period: params.get("periodo") === "YEARLY" ? "YEARLY" : current.period }));
    if (CURRENCIES.includes(params.get("moneda"))) setCurrency(params.get("moneda"));
    api("/platform/plans").then((response) => response.json()).then((data) => { setPlans(data.plans); setDemo(data.demo || {}); }).catch(() => setError("load"));
  }, [setCurrency]);
  useEffect(() => {
    gsap.to(barRef.current, { scaleX: (step + 1) / r.steps.length, duration: 0.6, ease: "power3.out" });
    gsap.fromTo(panelRef.current, { x: reduced() ? 0 : direction.current * 46, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    panelRef.current?.querySelector("input,button")?.focus({ preventScroll: true });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = plans.find((item) => item.id === form.plan);
  const prices = plan?.prices[currency];
  const total = prices ? (form.period === "YEARLY" ? prices.yearly : prices.monthly) : 0;
  const provider = currency === "COP" ? "wompi" : "stripe";
  const invalid = FIELDS.filter((key) => !rules[key](form[key]));
  const go = (next) => { direction.current = next > step ? 1 : -1; setError(""); setStep(next); };
  const next = (event) => { event.preventDefault(); if (step === 1 && invalid.length) return setTouched(Object.fromEntries(FIELDS.map((key) => [key, true]))); if (step < 2) return go(step + 1); pay(); };
  const pay = async () => { setLoading(true); setError(""); const response = await api("/platform/barbershops", { method: "POST", body: JSON.stringify({ ...form, currency }) }); const data = await response.json(); if (!response.ok) { setLoading(false); return setError(Array.isArray(data.message) ? data.message.join(". ") : data.message || r.failed); } window.location.href = data.checkoutUrl; };
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const priceLabel = (amount) => <>{money(amount)}<small>{form.period === "YEARLY" ? t.pricing.perYear : t.pricing.perMonth}</small></>;

  return <main className="os-reg">
    <section className="os-wizard">
      <p className="os-kicker">{r.kicker}</p><h1>{r.title}</h1>
      <ol className="os-stepper" aria-label={r.kicker}><i className="os-stepper-bar"><i ref={barRef} /></i>{r.steps.map((label, index) => <li key={index} className={index < step ? "done" : index === step ? "on" : ""} aria-current={index === step ? "step" : undefined}><button type="button" disabled={index > step} onClick={() => go(index)}><b>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</b>{label}</button></li>)}</ol>
      <form className="os-wiz-card" onSubmit={next} noValidate><div ref={panelRef}>
        {step === 0 && <><h2>{r.planTitle}</h2><p className="os-muted">{r.planLead}</p>
          <div className={`os-switch ${form.period === "YEARLY" ? "yearly" : ""}`} role="group" aria-label={t.pricing.monthly + " / " + t.pricing.yearly}><i className="knob" /><button type="button" aria-pressed={form.period === "MONTHLY"} onClick={() => setForm({ ...form, period: "MONTHLY" })}>{t.pricing.monthly}</button><button type="button" aria-pressed={form.period === "YEARLY"} onClick={() => setForm({ ...form, period: "YEARLY" })}>{t.pricing.yearly} <em>{t.pricing.yearlyDeal}</em></button></div>
          <div className="os-pick" role="radiogroup" aria-label={r.plan}>{plans.map((item) => <label key={item.id} className={`os-pick-card ${form.plan === item.id ? "sel" : ""}`}><input type="radio" name="plan" value={item.id} checked={form.plan === item.id} onChange={set("plan")} /><span className="os-pick-top"><b>{item.name[lang]}</b>{item.id === "pro" && <em>{t.pricing.recommended}</em>}</span><span className="os-pick-price">{priceLabel(form.period === "YEARLY" ? item.prices[currency].yearly : item.prices[currency].monthly)}</span><span className="os-muted">{item.barbers ? t.pricing.upTo(item.barbers) : t.pricing.unlimited}</span></label>)}</div></>}
        {step === 1 && <><h2>{r.shopTitle}</h2><p className="os-muted">{r.shopLead}</p>
          <div className="os-fields">{FIELDS.map((key) => { const [label, placeholder] = r.fields[key]; const bad = touched[key] && !rules[key](form[key]), ok = form[key] && rules[key](form[key]); return <label key={key} className={`os-field ${bad ? "bad" : ok ? "ok" : ""}`}>{label}<span className="os-input"><input type={{ email: "email", password: "password" }[key] || "text"} inputMode={key === "phone" ? "tel" : undefined} autoComplete={{ email: "email", phone: "tel", ownerName: "name", city: "address-level2", name: "organization", password: "new-password" }[key]} placeholder={placeholder} value={form[key]} onChange={set(key)} onBlur={() => setTouched({ ...touched, [key]: true })} aria-invalid={bad} /><i aria-hidden="true">{ok ? "✓" : ""}</i></span>{bad && <small>{r.hints[key]}</small>}</label>; })}</div></>}
        {step === 2 && <><h2>{r.reviewTitle}</h2><p className="os-muted">{r.reviewLead[provider]}</p>
          <dl className="os-review"><div><dt>{r.plan}</dt><dd>{plan?.name[lang]} · {t.period[form.period]} · {currency}</dd><button type="button" onClick={() => go(0)}>{r.change}</button></div><div><dt>{r.shop}</dt><dd>{form.name} · {form.city}</dd><button type="button" onClick={() => go(1)}>{r.edit}</button></div><div><dt>{r.owner}</dt><dd>{form.ownerName} · {form.email} · {form.phone}</dd><button type="button" onClick={() => go(1)}>{r.edit}</button></div></dl>
          <div className="os-methods" aria-label={r.methodsLabel}>{r.methods[currency].map((method) => <span key={method}>{method}</span>)}</div>
          {demo[currency] && <p className="os-demo-note">{r.demoNote}</p>}</>}
        {error && <p className="os-error" role="alert">{error === "load" ? r.loadFailed : error}</p>}
        <div className="os-wiz-actions">{step > 0 ? <button type="button" className="os-btn os-btn-ghost" onClick={() => go(step - 1)}>{r.back}</button> : <a className="os-btn os-btn-ghost" href="/#precios">{r.seePrices}</a>}<button className="os-btn os-btn-main" disabled={!plan || loading}>{step < 2 ? r.next : loading ? r.connecting : r.pay(money(total))} <span className="arrow">→</span></button></div>
      </div></form>
    </section>
    <aside className="os-side"><p className="os-side-label">{r.sideLabel}</p><h2>{plan ? plan.name[lang] : "…"}</h2><p className="os-side-price">{plan ? <Tween value={total} format={(n) => money(Math.round(n))} /> : "…"}<small>{form.period === "YEARLY" ? t.pricing.perYear : t.pricing.perMonth}</small></p>{form.period === "YEARLY" && prices && <p className="os-side-save">{r.save(money(prices.monthly * 2))}</p>}
      <ul>{plan?.features[lang].map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <div className="os-trust">{r.trust.map(([title, text]) => <p key={title}><b>{title}</b>{text}</p>)}</div></aside>
  </main>;
}
