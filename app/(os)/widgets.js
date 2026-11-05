"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const planName = (id) => ({ basico: "Básico", pro: "Pro", full: "Full" })[id] || id;
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
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{format(value)}</span>;
}

const agenda = [["9:00", "Andrés P.", "Corte y barba", "Kevin"], ["10:30", "Camilo R.", "Solo corte", "Esteban"], ["12:00", "Almuerzo", "Bloqueado", "Kevin"], ["3:30", "Santiago M.", "Barba", "Esteban"]];
const toasts = [["+", "Nueva reserva", "Juan D. · Solo corte · 4:00 p.m."], ["↻", "Cita reprogramada", "Andrés pasó a las 11:00 a.m."], ["✓", "Corte completado", "Santiago M. · $ 20.000"]];

export function HeroApp() {
  const [toast, setToast] = useState(0), ref = useRef(null);
  useEffect(() => {
    const id = setInterval(() => gsap.to(ref.current, { y: 14, opacity: 0, duration: 0.25, onComplete: () => { setToast((n) => (n + 1) % toasts.length); gsap.fromTo(ref.current, { y: reduced() ? 0 : 24, opacity: 0, scale: reduced() ? 1 : 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }); } }), 3200);
    return () => clearInterval(id);
  }, []);
  const [ico, title, sub] = toasts[toast];
  return <div className="os-app" data-hero-app aria-hidden="true">
    <div className="os-app-bar"><b>Legacy Barber<small>Agenda</small></b><span className="os-live">En vivo</span></div>
    <div className="os-app-body"><div className="os-app-head"><b>Hoy</b><span>4 citas · 2 barberos</span></div>{agenda.map(([time, who, what, barber]) => <div className={`os-row ${what === "Bloqueado" ? "blocked" : ""}`} key={time}><b>{time}</b><span>{who}<small>{what}</small></span><em>{barber}</em></div>)}</div>
    <div className="os-toast" ref={ref}><i>{ico}</i><div>{title}<small>{sub}</small></div></div>
  </div>;
}

// Pantallas del teléfono para "Cómo funciona"; step lo controla el scroll.
export function Phone({ step }) {
  return <div className="os-phone" aria-hidden="true"><div className="os-screen">
    <div className={step === 0 ? "on" : ""}><h4>¿Qué te vas a hacer?</h4><span className="os-chip">Corte y barba <b>$45.000</b></span><span className="os-chip sel">Solo corte <b>$30.000</b></span><span className="os-chip">Barba <b>$20.000</b></span><h4 style={{ marginTop: 14 }}>¿Quién te corta?</h4><span className="os-chip sel">Kevin <b>Fades</b></span><span className="os-chip">Esteban <b>Clásico</b></span></div>
    <div className={step === 1 ? "on" : ""}><h4>Martes 21 de octubre</h4><p style={{ margin: 0, fontSize: 13, color: "#5b6270" }}>Solo ves horas libres de verdad.</p><div className="os-times">{["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30"].map((time, index) => <span key={time} className={time === "10:30" ? "sel" : [1, 4, 8].includes(index) ? "off" : ""}>{time}</span>)}</div></div>
    <div className={step === 2 ? "on" : ""}><div className="os-ok">✓</div><h4 style={{ textAlign: "center" }}>¡Listo, Camilo!</h4><div className="os-ticket"><p><span>Servicio</span><b>Solo corte</b></p><p><span>Barbero</span><b>Kevin</b></p><p><span>Hora</span><b>Mar 21 · 10:30</b></p><p><span>Código</span><b>A1B2C3</b></p></div></div>
  </div></div>;
}

const demoServices = [["Solo corte", 30000], ["Corte y barba", 45000], ["Barba", 20000]];
const demoBarbers = ["Kevin", "Esteban", "Brayan"];
const demoTimes = ["9:00", "10:00", "11:30", "2:00", "3:30", "5:00"];

// Mini reserva de prueba: no toca el backend, solo muestra cómo se siente.
export function Demo() {
  const [pick, setPick] = useState({ service: 0, barber: 0, time: "" }), [ticket, setTicket] = useState(null), ticketRef = useRef(null);
  useEffect(() => { if (ticket && ticketRef.current) gsap.fromTo(ticketRef.current, { y: reduced() ? 0 : 30, opacity: 0, rotate: reduced() ? 0 : -3 }, { y: 0, opacity: 1, rotate: 0, duration: 0.6, ease: "back.out(1.6)" }); }, [ticket]);
  const book = () => setTicket({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), ...pick });
  const choose = (patch) => { setPick({ ...pick, ...patch }); setTicket(null); };
  return <div className="os-panel"><h3>Reserva como un cliente</h3><p className="os-muted" style={{ margin: 0 }}>Así ven tus clientes BarberOS. Es una demo: no se guarda nada.</p>
    <span className="os-label">Servicio</span><div className="os-pills">{demoServices.map(([name], index) => <button type="button" key={name} className={`os-pill ${pick.service === index ? "sel" : ""}`} onClick={() => choose({ service: index })}>{name}</button>)}</div>
    <span className="os-label">Barbero</span><div className="os-pills">{demoBarbers.map((name, index) => <button type="button" key={name} className={`os-pill ${pick.barber === index ? "sel" : ""}`} onClick={() => choose({ barber: index })}>{name}</button>)}</div>
    <span className="os-label">Hora de mañana</span><div className="os-pills">{demoTimes.map((time) => <button type="button" key={time} className={`os-pill ${pick.time === time ? "sel" : ""}`} onClick={() => choose({ time })}>{time}</button>)}</div>
    <div style={{ marginTop: 24 }}><button type="button" className="os-btn os-btn-dark" disabled={!pick.time} onClick={book}>Confirmar reserva de prueba <span className="arrow">→</span></button></div>
    {ticket && <div className="os-demo-ticket" ref={ticketRef}><b>¡Turno apartado! #{ticket.code}</b><span>{demoServices[ticket.service][0]} con {demoBarbers[ticket.barber]} · mañana {ticket.time} · {money.format(demoServices[ticket.service][1])}</span></div>}
  </div>;
}

const recommend = (barbers) => barbers <= 1 ? "basico" : barbers <= 5 ? "pro" : "full";

export function Calculator({ plans }) {
  const [barbers, setBarbers] = useState(3), [perDay, setPerDay] = useState(10);
  const plan = plans.find((item) => item.id === recommend(barbers));
  const perCut = plan ? plan.monthly / (barbers * perDay * 26) : 0;
  return <div className="os-panel"><h3>¿Cuánto te cuesta por corte?</h3><p className="os-muted" style={{ margin: 0 }}>Mueve los controles y te decimos qué plan te sirve.</p>
    <span className="os-label">Barberos en tu equipo</span><div className="os-range-row"><b>{barbers}</b><span className="os-muted">barbero{barbers > 1 ? "s" : ""}</span></div><input className="os-range" type="range" min="1" max="15" value={barbers} onChange={(event) => setBarbers(Number(event.target.value))} aria-label="Barberos" />
    <span className="os-label">Cortes por barbero al día</span><div className="os-range-row"><b>{perDay}</b><span className="os-muted">al día</span></div><input className="os-range" type="range" min="3" max="20" value={perDay} onChange={(event) => setPerDay(Number(event.target.value))} aria-label="Cortes por día" />
    <div className="os-result-box"><small>Plan recomendado: {plan?.name || "…"}</small><b><Tween value={perCut} format={(n) => money.format(n)} /></b><span>por corte, con {plan ? money.format(plan.monthly) : "…"} al mes ({(barbers * perDay * 26).toLocaleString("es-CO")} cortes/mes)</span></div>
  </div>;
}

export function Pricing({ plans }) {
  const [period, setPeriod] = useState("MONTHLY");
  return <>
    <div className={`os-switch ${period === "YEARLY" ? "yearly" : ""}`} role="group" aria-label="Periodo de pago"><i className="knob" /><button type="button" aria-pressed={period === "MONTHLY"} onClick={() => setPeriod("MONTHLY")}>Mensual</button><button type="button" aria-pressed={period === "YEARLY"} onClick={() => setPeriod("YEARLY")}>Anual <em>−2 meses</em></button></div>
    <div className="os-plans">{plans === null ? <p className="os-muted">Cargando planes…</p> : plans.length === 0 ? <p className="os-muted">No pudimos cargar los precios. Intenta de nuevo en un momento.</p> : plans.map((plan) => <article className={`os-plan ${plan.id === "pro" ? "featured" : ""}`} key={plan.id}>{plan.id === "pro" && <span className="os-badge">Recomendado</span>}<h3>{plan.name}</h3><span className="os-muted">{plan.barbers ? `Hasta ${plan.barbers} barbero${plan.barbers > 1 ? "s" : ""}` : "Barberos ilimitados"}</span><p className="os-price"><Tween value={period === "YEARLY" ? plan.yearly : plan.monthly} format={(n) => money.format(n)} /><small>{period === "YEARLY" ? "/año" : "/mes"}</small></p><span className="os-muted" style={{ fontSize: 14 }}>{period === "YEARLY" ? `Equivale a ${money.format(Math.round(plan.yearly / 12))} al mes` : "Sin permanencia"}</span><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><a className={`os-btn ${plan.id === "pro" ? "os-btn-main" : "os-btn-dark"}`} data-magnetic href={`/registro?plan=${plan.id}&periodo=${period}`}>Elegir {plan.name} <span className="arrow">→</span></a></article>)}</div>
  </>;
}
