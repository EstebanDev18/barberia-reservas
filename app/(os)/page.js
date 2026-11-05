"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { api } from "@/lib/api";
import { Calculator, Demo, HeroApp, Phone, Pricing } from "./widgets";

const manifesto = "Nacimos viendo el día a día de una barbería de verdad: el cliente que llama mientras estás cortando, el turno que se cruzó, el almuerzo que nunca llega a tiempo. BarberOS existe para que cada barbero dedique su tiempo a cortar, no a cuadrar agendas.";
const facts = [["Cliente", "Reserva desde un link, sin instalar nada ni crear cuenta."], ["Cambios", "Mueve o cancela su cita hasta 2 horas antes."], ["Licencia", "Pagas en línea y la barbería queda activa al instante."]];
const values = [["01", "Hecho para el gremio", "Pensado con la rutina real de una barbería: turnos, almuerzos, clientes fijos y días a reventar."], ["02", "Simple de verdad", "Si tu cliente sabe usar WhatsApp, sabe reservar. Si tú sabes cortar, sabes usar el panel."], ["03", "Tus datos son tuyos", "Tus clientes y tu agenda pertenecen a tu barbería. No los vendemos ni los compartimos."]];
const steps = [["El cliente elige", "Servicio y barbero desde su celular, sin crear cuenta: solo nombre y teléfono."], ["Escoge la hora", "Solo ve horas libres de verdad. Nunca quedan dos clientes en la misma silla."], ["Queda confirmado", "Recibe su código y puede mover o cancelar la cita hasta 2 horas antes."]];
const features = [["Reservas 24/7", "Tus clientes apartan su silla a cualquier hora, desde un link. Sin apps que instalar.", true], ["Agenda por barbero", "Cada barbero con su agenda; los choques de horario son imposibles.", true], ["Bloqueos de horario", "Almuerzo, vacaciones o una diligencia: bloqueas el rato y nadie lo reserva."], ["Reprogramar y cancelar", "El cliente mueve su cita solo, sin escribirte por WhatsApp."], ["Tu carta, tus precios", "Servicios, precios y duraciones editables desde el panel."], ["Panel del equipo", "El día completo o filtrado por barbero; agregas y retiras gente en segundos.", true], ["Pagos seguros", "Tu licencia se paga con Wompi: tarjeta, PSE, Nequi o Bancolombia.", true]];
const faqs = [["¿Tengo que instalar algo?", "No. BarberOS funciona en el navegador del celular o del computador. Tus clientes reservan desde un link."], ["¿Mis clientes necesitan crear una cuenta?", "No. Para reservar solo dejan su nombre y su teléfono; con ese teléfono consultan, mueven o cancelan su cita."], ["¿Cómo pago la licencia?", "En línea con Wompi: tarjeta, PSE, Nequi o Bancolombia. Apenas el pago queda aprobado, tu barbería se activa."], ["¿Qué plan me sirve?", "Depende de cuántos barberos tienes: Básico para uno, Pro hasta cinco y Full sin límite. La calculadora de arriba te lo dice."]];

export default function SoftwarePage() {
  const [plans, setPlans] = useState(null), [step, setStep] = useState(0), rootRef = useRef(null);
  useEffect(() => { api("/platform/plans").then((response) => response.ok ? response.json() : null).then((data) => setPlans(data?.plans || [])).catch(() => setPlans([])); }, []);
  // Los planes cambian la altura de la página: hay que recalcular dónde empieza cada animación de scroll.
  useEffect(() => { if (plans) ScrollTrigger.refresh(); }, [plans]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    root.classList.add("os-js");
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.to(".os-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
      // Con "reducir movimiento" todo sigue funcionando, pero sin desplazamientos grandes ni efectos con el mouse.
      mm.add({ full: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 961px)" }, ({ conditions: { full, desktop } }) => {
        const move = (px) => (full ? px : 0);
        gsap.from("[data-hero]", { y: move(40), opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" });
        gsap.from("[data-hero-app]", { y: move(70), rotateX: move(14), opacity: 0, duration: 1.2, delay: 0.25, ease: "power3.out", transformPerspective: 1000 });
        ScrollTrigger.batch("[data-os-reveal]", { start: "top 88%", once: true, onEnter: (elements) => gsap.fromTo(elements, { opacity: 0, y: move(44) }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out" }) });
        gsap.fromTo(".os-manifesto .w", { opacity: 0.14 }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ".os-manifesto", start: "top 80%", end: "bottom 50%", scrub: true } });
        // "Cómo funciona": en escritorio la sección se queda fija y el scroll avanza los pasos; en móvil cada paso activa su pantalla.
        if (desktop) ScrollTrigger.create({ trigger: ".os-how", start: "top top", end: "+=200%", pin: true, onUpdate: (self) => setStep(Math.min(2, Math.floor(self.progress * 3))) });
        else gsap.utils.toArray(".os-step").forEach((element, index) => ScrollTrigger.create({ trigger: element, start: "top 70%", end: "bottom 30%", onToggle: (self) => self.isActive && setStep(index) }));
        if (!full) return;
        // Botones magnéticos, app inclinada y manchas de color que siguen el mouse en el hero.
        const cleanups = [];
        gsap.utils.toArray("[data-magnetic]").forEach((element) => {
          const onMove = (event) => { const box = element.getBoundingClientRect(); gsap.to(element, { x: (event.clientX - box.left - box.width / 2) * 0.3, y: (event.clientY - box.top - box.height / 2) * 0.4, duration: 0.4, ease: "power3.out" }); };
          const onLeave = () => gsap.to(element, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, .4)" });
          element.addEventListener("pointermove", onMove); element.addEventListener("pointerleave", onLeave);
          cleanups.push(() => { element.removeEventListener("pointermove", onMove); element.removeEventListener("pointerleave", onLeave); });
        });
        const hero = root.querySelector(".os-hero");
        const onHero = (event) => { const box = hero.getBoundingClientRect(), x = (event.clientX - box.left) / box.width - 0.5, y = (event.clientY - box.top) / box.height - 0.5; gsap.to("[data-hero-app]", { rotateY: x * 12, rotateX: -y * 9, transformPerspective: 1000, duration: 0.7, ease: "power3.out" }); };
        hero.addEventListener("pointermove", onHero);
        cleanups.push(() => hero.removeEventListener("pointermove", onHero));
        return () => cleanups.forEach((fn) => fn());
      });
    }, root);
    return () => { ctx.revert(); mm.revert(); root.classList.remove("os-js"); };
  }, []);

  // El spotlight de las funciones sigue al mouse con variables CSS (no es animación, funciona siempre).
  const spotlight = (event) => { const card = event.target.closest(".os-feat"); if (!card) return; const box = card.getBoundingClientRect(); card.style.setProperty("--x", `${event.clientX - box.left}px`); card.style.setProperty("--y", `${event.clientY - box.top}px`); };

  return <main ref={rootRef}>
    <section className="os-hero os-dark">
      <div><p className="os-kicker" data-hero>Software de reservas para barberías</p><h1 data-hero>Tu agenda se llena <em>mientras tú cortas.</em></h1><p className="os-lead os-muted" data-hero>Reservas en línea, agenda por barbero y tu carta de precios en un solo lugar. Tus clientes apartan su silla en 3 pasos; tú dejas de cuadrar turnos por WhatsApp.</p>
        <div className="os-actions" data-hero><a className="os-btn os-btn-main" data-magnetic href="/registro">Registrar mi barbería <span className="arrow">→</span></a><a className="os-btn os-btn-ghost" data-magnetic href="#demo">Pruébalo en vivo</a></div>
        <ul className="os-facts" data-hero>{facts.map(([label, text]) => <li key={label}><span>{label}</span>{text}</li>)}</ul></div>
      <div><HeroApp /></div></section>

    <section className="os-section os-light" id="nosotros"><p className="os-kicker" data-os-reveal>Quiénes somos</p><p className="os-manifesto">{manifesto.split(" ").map((word, index) => <span className="w" key={index}>{word}</span>)}</p>
      <div className="os-about"><div className="os-about-lead" data-os-reveal><h3>Hacia dónde vamos</h3><p>Que cualquier barbería, grande o pequeña, tenga las herramientas de una cadena, a un precio que se pague solo con un par de cortes al mes.</p></div>
        <ol className="os-principles">{values.map(([number, title, text]) => <li data-os-reveal key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>

    <section className="os-section os-dark os-how"><div><p className="os-kicker">Cómo funciona</p><h2>Reservar toma tres toques</h2><p className="os-muted">Así lo vive tu cliente desde el celular.</p><div className="os-steps">{steps.map(([title, text], index) => <div className={`os-step ${step === index ? "on" : ""}`} key={title}><b>{index + 1}</b><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div><Phone step={step} /></section>

    <section className="os-section os-dark" id="funciones" onPointerMove={spotlight}><div className="os-head"><p className="os-kicker" data-os-reveal>Funciones</p><h2 data-os-reveal>Lo que pasa en tu barbería, en un solo panel</h2></div><div className="os-bento">{features.map(([title, text, wide], index) => <article className={`os-feat ${wide ? "wide" : ""}`} data-os-reveal key={title}><span className="num">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="os-soon os-muted">Próximamente: recordatorios automáticos por correo y WhatsApp.</p></section>

    <section className="os-section os-light" id="demo"><div className="os-head"><p className="os-kicker" data-os-reveal>Pruébalo</p><h2 data-os-reveal>Pruébalo antes de pagar</h2><p className="os-muted" data-os-reveal>Haz una reserva de prueba y calcula cuánto te cuesta cada corte con tu equipo.</p></div><div className="os-split"><div data-os-reveal><Demo /></div><div data-os-reveal><Calculator plans={plans || []} /></div></div></section>

    <section className="os-section os-light" id="precios" style={{ paddingTop: 0 }}><div className="os-head"><p className="os-kicker" data-os-reveal>Precios</p><h2 data-os-reveal>Pagas según tu equipo, no por reserva</h2></div><div data-os-reveal><Pricing plans={plans} /></div><p className="os-fine">Valores en pesos colombianos. Pagas con tarjeta, PSE, Nequi o Bancolombia a través de Wompi.</p></section>

    <section className="os-section os-dark os-faq-wrap" id="preguntas"><div className="os-head"><p className="os-kicker" data-os-reveal>Preguntas frecuentes</p><h2 data-os-reveal>Lo que más nos preguntan</h2></div><div className="os-faq">{faqs.map(([question, answer]) => <details key={question} data-os-reveal><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <div className="os-dark"><section className="os-cta" data-os-reveal><div><h2>Tu barbería, sin filas y sin cuentos.</h2><p>Elige tu plan, paga en línea y empieza a recibir reservas hoy.</p></div><a className="os-btn os-btn-main" data-magnetic href="/registro">Registrar mi barbería <span className="arrow">→</span></a></section></div>
  </main>;
}
