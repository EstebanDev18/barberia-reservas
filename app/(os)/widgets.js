"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useOs } from "./i18n";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const plain = (n) => Math.round(n).toLocaleString("es-CO");

// Número que se anima desde su valor anterior cada vez que cambia.
export function Tween({ value, format = plain }) {
  const ref = useRef(null), last = useRef(value);
  useEffect(() => {
    const state = { v: last.current };
    const tween = gsap.to(state, { v: value, duration: reduced() ? 0.3 : 0.9, ease: "power3.out", onUpdate: () => { if (ref.current) ref.current.textContent = format(state.v); } });
    last.current = value;
    return () => tween.kill();
  }, [value, format]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{format(value)}</span>;
}

export function HeroApp() {
  const { t } = useOs();
  const [toast, setToast] = useState(0), ref = useRef(null);
  useEffect(() => {
    const id = setInterval(() => gsap.to(ref.current, { y: 14, opacity: 0, duration: 0.25, onComplete: () => { setToast((n) => (n + 1) % 3); gsap.fromTo(ref.current, { y: reduced() ? 0 : 24, opacity: 0, scale: reduced() ? 1 : 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }); } }), 3200);
    return () => clearInterval(id);
  }, []);
  const [ico, title, sub] = t.app.toasts[toast];
  return <div className="os-app" data-hero-app aria-hidden="true">
    <div className="os-app-bar"><b>Legacy Barber<small>{t.app.title}</small></b><span className="os-live">{t.app.live}</span></div>
    <div className="os-app-body"><div className="os-app-head"><b>{t.app.today}</b><span>{t.app.summary}</span></div>{t.app.agenda.map(([time, who, what, barber]) => <div className={`os-row ${what === t.app.blocked ? "blocked" : ""}`} key={time}><b>{time}</b><span>{who}<small>{what}</small></span><em>{barber}</em></div>)}</div>
    <div className="os-toast" ref={ref}><i>{ico}</i><div>{title}<small>{sub}</small></div></div>
  </div>;
}

// Pantallas del teléfono para "Cómo funciona"; step lo controla el scroll.
export function Phone({ step }) {
  const { t, money, currency } = useOs(), p = t.how.phone, prices = t.demo.prices[currency];
  const menu = [[t.demo.services[1], prices[1]], [t.demo.services[0], prices[0]], [t.demo.services[2], prices[2]]];
  return <div className="os-phone" aria-hidden="true"><div className="os-screen">
    <div className={step === 0 ? "on" : ""}><h4>{p.what}</h4>{menu.map(([name, price], index) => <span key={name} className={`os-chip ${index === 1 ? "sel" : ""}`}>{name} <b>{money(price)}</b></span>)}<h4 style={{ marginTop: 14 }}>{p.who}</h4><span className="os-chip sel">Kevin <b>{p.styles[0]}</b></span><span className="os-chip">Esteban <b>{p.styles[1]}</b></span></div>
    <div className={step === 1 ? "on" : ""}><h4>{p.day}</h4><p style={{ margin: 0, fontSize: 13, color: "#5b6270" }}>{p.onlyFree}</p><div className="os-times">{["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30"].map((time, index) => <span key={time} className={time === "10:30" ? "sel" : [1, 4, 8].includes(index) ? "off" : ""}>{time}</span>)}</div></div>
    <div className={step === 2 ? "on" : ""}><div className="os-ok">✓</div><h4 style={{ textAlign: "center" }}>{p.done}</h4><div className="os-ticket"><p><span>{p.service}</span><b>{t.demo.services[0]}</b></p><p><span>{p.barber}</span><b>Kevin</b></p><p><span>{p.time}</span><b>{p.when}</b></p><p><span>{p.code}</span><b>A1B2C3</b></p></div></div>
  </div></div>;
}

const demoBarbers = ["Kevin", "Esteban", "Brayan"];
const demoTimes = ["9:00", "10:00", "11:30", "2:00", "3:30", "5:00"];

// Mini reserva de prueba: no toca el backend, solo muestra cómo se siente.
export function Demo() {
  const { t, money, currency } = useOs(), d = t.demo;
  const [pick, setPick] = useState({ service: 0, barber: 0, time: "" }), [ticket, setTicket] = useState(null), ticketRef = useRef(null);
  useEffect(() => { if (ticket && ticketRef.current) gsap.fromTo(ticketRef.current, { y: reduced() ? 0 : 30, opacity: 0, rotate: reduced() ? 0 : -3 }, { y: 0, opacity: 1, rotate: 0, duration: 0.6, ease: "back.out(1.6)" }); }, [ticket]);
  const book = () => setTicket({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), ...pick });
  const choose = (patch) => { setPick({ ...pick, ...patch }); setTicket(null); };
  return <div className="os-panel"><h3>{d.bookTitle}</h3><p className="os-muted" style={{ margin: 0 }}>{d.bookLead}</p>
    <span className="os-label">{d.service}</span><div className="os-pills">{d.services.map((name, index) => <button type="button" key={name} className={`os-pill ${pick.service === index ? "sel" : ""}`} onClick={() => choose({ service: index })}>{name}</button>)}</div>
    <span className="os-label">{d.barber}</span><div className="os-pills">{demoBarbers.map((name, index) => <button type="button" key={name} className={`os-pill ${pick.barber === index ? "sel" : ""}`} onClick={() => choose({ barber: index })}>{name}</button>)}</div>
    <span className="os-label">{d.time}</span><div className="os-pills">{demoTimes.map((time) => <button type="button" key={time} className={`os-pill ${pick.time === time ? "sel" : ""}`} onClick={() => choose({ time })}>{time}</button>)}</div>
    <div style={{ marginTop: 24 }}><button type="button" className="os-btn os-btn-dark" disabled={!pick.time} onClick={book}>{d.confirm} <span className="arrow">→</span></button></div>
    {ticket && <div className="os-demo-ticket" ref={ticketRef}><b>{d.booked} #{ticket.code}</b><span>{d.services[ticket.service]} {d.with} {demoBarbers[ticket.barber]} · {d.tomorrow} {ticket.time} · {money(d.prices[currency][ticket.service])}</span></div>}
  </div>;
}

const recommend = (barbers) => barbers <= 1 ? "basico" : barbers <= 5 ? "pro" : "full";

export function Calculator({ plans }) {
  const { t, money, currency, lang } = useOs(), d = t.demo;
  const [barbers, setBarbers] = useState(3), [perDay, setPerDay] = useState(10);
  const plan = plans.find((item) => item.id === recommend(barbers));
  const monthly = plan?.prices[currency].monthly ?? 0, cuts = barbers * perDay * 26;
  const perCut = plan ? monthly / cuts : 0;
  return <div className="os-panel"><h3>{d.calcTitle}</h3><p className="os-muted" style={{ margin: 0 }}>{d.calcLead}</p>
    <span className="os-label">{d.team}</span><div className="os-range-row"><b>{barbers}</b><span className="os-muted">{d.barbers(barbers)}</span></div><input className="os-range" type="range" min="1" max="15" value={barbers} onChange={(event) => setBarbers(Number(event.target.value))} aria-label={d.team} />
    <span className="os-label">{d.perDay}</span><div className="os-range-row"><b>{perDay}</b><span className="os-muted">{d.day}</span></div><input className="os-range" type="range" min="3" max="20" value={perDay} onChange={(event) => setPerDay(Number(event.target.value))} aria-label={d.perDay} />
    <div className="os-result-box"><small>{d.recommended}: {plan?.name[lang] || "…"}</small><b><Tween value={perCut} format={(n) => money(currency === "COP" ? Math.round(n) : Math.round(n * 100) / 100)} /></b><span>{d.perCut}, {plan ? money(monthly) : "…"} {d.month} ({cuts.toLocaleString(t.locale)} {d.cutsMonth})</span></div>
  </div>;
}

export function Pricing({ plans }) {
  const { t, money, currency, lang } = useOs(), p = t.pricing;
  const [period, setPeriod] = useState("MONTHLY");
  return <>
    <div className={`os-switch ${period === "YEARLY" ? "yearly" : ""}`} role="group" aria-label={p.monthly + " / " + p.yearly}><i className="knob" /><button type="button" aria-pressed={period === "MONTHLY"} onClick={() => setPeriod("MONTHLY")}>{p.monthly}</button><button type="button" aria-pressed={period === "YEARLY"} onClick={() => setPeriod("YEARLY")}>{p.yearly} <em>{p.yearlyDeal}</em></button></div>
    <div className="os-plans">{plans === null ? <p className="os-muted">{p.loading}</p> : plans.length === 0 ? <p className="os-muted">{p.failed}</p> : plans.map((plan) => { const price = plan.prices[currency]; return <article className={`os-plan ${plan.id === "pro" ? "featured" : ""}`} key={plan.id}>{plan.id === "pro" && <span className="os-badge">{p.recommended}</span>}<h3>{plan.name[lang]}</h3><span className="os-muted">{plan.barbers ? p.upTo(plan.barbers) : p.unlimited}</span><p className="os-price"><Tween value={period === "YEARLY" ? price.yearly : price.monthly} format={(n) => money(Math.round(n))} /><small>{period === "YEARLY" ? p.perYear : p.perMonth}</small></p><span className="os-muted" style={{ fontSize: 14 }}>{period === "YEARLY" ? p.equals(money(currency === "COP" ? Math.round(price.yearly / 12) : Math.round(price.yearly / 12 * 100) / 100)) : p.noLockIn}</span><ul>{plan.features[lang].map((feature) => <li key={feature}>{feature}</li>)}</ul><a className={`os-btn ${plan.id === "pro" ? "os-btn-main" : "os-btn-dark"}`} data-magnetic href={`/registro?plan=${plan.id}&periodo=${period}`}>{p.choose(plan.name[lang])} <span className="arrow">→</span></a></article>; })}</div>
    <p className="os-fine">{p.fine[currency]}</p>
  </>;
}
