"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const features = [
  ["Reservas 24/7", "Tus clientes apartan su silla desde el celular, sin llamar y sin crear cuenta: solo nombre y teléfono."],
  ["Agenda por barbero", "Cada barbero tiene su propia agenda. Dos clientes nunca quedan en la misma silla a la misma hora."],
  ["Bloqueos de horario", "Almuerzo, vacaciones o una diligencia: bloqueas el rato y nadie lo puede reservar."],
  ["Reprogramar y cancelar", "El cliente mueve o cancela su cita hasta 2 horas antes, sin escribirte por WhatsApp."],
  ["Tu carta, tus precios", "Agregas servicios, cambias precios y duraciones desde el panel, sin tocar código."],
  ["Panel del equipo", "Ves el día completo o filtras por barbero, marcas citas completadas y gestionas a tu gente."],
];
const values = [
  ["Hecho para el gremio", "Pensado con la rutina real de una barbería: turnos, almuerzos, clientes fijos y días a reventar."],
  ["Simple de verdad", "Si tu cliente sabe usar WhatsApp, sabe reservar. Si tú sabes cortar, sabes usar el panel."],
  ["Tus datos son tuyos", "Tus clientes y tu agenda pertenecen a tu barbería. No los vendemos ni los compartimos."],
];
const faqs = [
  ["¿Tengo que instalar algo?", "No. BarberOS funciona en el navegador del celular o del computador. Tus clientes reservan desde un link."],
  ["¿Mis clientes necesitan crear una cuenta?", "No. Para reservar solo dejan su nombre y su teléfono; con ese teléfono consultan, mueven o cancelan su cita."],
  ["¿Cómo pago la licencia?", "En línea con Wompi: tarjeta, PSE, Nequi o Bancolombia. Apenas el pago queda aprobado, tu barbería se activa."],
];

export default function SoftwarePage() {
  const [plans, setPlans] = useState(null), [period, setPeriod] = useState("MONTHLY");
  useEffect(() => { api("/platform/plans").then((response) => response.ok ? response.json() : null).then((data) => setPlans(data?.plans || [])).catch(() => setPlans([])); }, []);
  return <main className="os-main">
    <section className="os-hero"><div><p className="eyebrow">Software para barberías</p><h1>El sistema operativo de tu <span className="os-mark">barbería.</span></h1><p className="os-lead">Reservas en línea, agenda por barbero y tu carta de precios en un solo lugar. Tus clientes apartan su silla sin llamar y tú dejas de cuadrar turnos por WhatsApp.</p><div className="os-actions"><a className="primary" href="#precios">Ver precios <span>→</span></a><a className="secondary" href="/software/registro">Registrar mi barbería</a></div></div>
      <div className="os-mock" aria-hidden="true"><div className="os-mock-head"><b>Hoy</b><span>3 citas · 1 bloqueo</span></div>{[["9:00", "Andrés P.", "Corte y barba", "Kevin"], ["10:30", "Camilo R.", "Solo corte", "Esteban"], ["12:00", "Almuerzo", "Bloqueado", "Kevin"], ["15:30", "Santiago M.", "Barba", "Esteban"]].map(([time, who, what, barber], index) => <div className={`os-mock-row ${what === "Bloqueado" ? "blocked" : ""}`} key={time} style={{ "--d": `${index * 120}ms` }}><b>{time}</b><span>{who}<small>{what}</small></span><em>{barber}</em></div>)}</div></section>

    <section className="os-section os-light" id="nosotros"><p className="eyebrow">Quiénes somos</p><h2>Nacimos en la barbería, <span className="os-mark">no en una oficina.</span></h2><div className="os-about"><p>BarberOS es un software colombiano para barberías de barrio y de cadena. Lo construimos viendo el día a día de una barbería de verdad: el cliente que llama mientras estás cortando, el turno que se cruzó, el almuerzo que nunca llega a tiempo.</p><p><strong>Nuestra misión</strong> es que cada barbero dedique su tiempo a cortar, no a cuadrar agendas. <strong>Nuestra visión</strong> es que cualquier barbería, grande o pequeña, tenga las mismas herramientas que una cadena, a un precio que se pague solo con un par de cortes al mes.</p></div>
      <div className="os-cards">{values.map(([title, text]) => <article className="os-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="os-section" id="funciones"><p className="eyebrow">Funciones</p><h2>Todo lo que tu barbería <span className="os-mark">necesita.</span></h2><div className="os-features">{features.map(([title, text], index) => <article className="os-feature" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="os-note">Próximamente: recordatorios automáticos por correo y WhatsApp.</p></section>

    <section className="os-section os-light" id="precios"><p className="eyebrow">Precios</p><h2>Un plan para cada <span className="os-mark">barbería.</span></h2><div className="os-toggle" role="group" aria-label="Periodo de pago">{[["MONTHLY", "Mensual"], ["YEARLY", "Anual · 2 meses gratis"]].map(([id, label]) => <button key={id} type="button" aria-pressed={period === id} className={period === id ? "on" : ""} onClick={() => setPeriod(id)}>{label}</button>)}</div>
      {plans === null ? <p className="os-note">Cargando planes…</p> : plans.length === 0 ? <p className="os-note">No pudimos cargar los precios. Intenta de nuevo en un momento.</p> : <div className="os-plans">{plans.map((plan) => <article className={`os-plan ${plan.id === "pro" ? "featured" : ""}`} key={plan.id}>{plan.id === "pro" && <p className="os-badge">Recomendado</p>}<h3>{plan.name}</h3><p className="os-price">{money.format(period === "YEARLY" ? plan.yearly : plan.monthly)}<small>{period === "YEARLY" ? "/año" : "/mes"}</small></p>{period === "YEARLY" && <p className="os-save">Equivale a {money.format(Math.round(plan.yearly / 12))}/mes</p>}<ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><a className="primary" href={`/software/registro?plan=${plan.id}&periodo=${period}`}>Elegir {plan.name} <span>→</span></a></article>)}</div>}
      <p className="os-note">Valores en pesos colombianos. Pagas con tarjeta, PSE, Nequi o Bancolombia a través de Wompi.</p></section>

    <section className="os-section" id="preguntas"><p className="eyebrow">Preguntas frecuentes</p><h2>Lo que más nos <span className="os-mark">preguntan.</span></h2><div className="os-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="os-cta"><h2>Tu barbería, sin filas y sin cuentos.</h2><p>Elige tu plan, paga en línea y empieza a recibir reservas.</p><a className="primary" href="/software/registro">Registrar mi barbería <span>→</span></a></section>
  </main>;
}
