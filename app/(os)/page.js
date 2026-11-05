"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { api } from "@/lib/api";
import { useOs } from "./i18n";
import { Calculator, Demo, HeroApp, Phone, Pricing } from "./widgets";

// Las listas usan el índice como key a propósito: al cambiar de idioma React reutiliza los mismos nodos (solo cambia el texto),
// así no se pierden las animaciones de aparición que GSAP ya les aplicó.
export default function SoftwarePage() {
  const { t, lang } = useOs();
  const [plans, setPlans] = useState(null), [step, setStep] = useState(0), rootRef = useRef(null);
  useEffect(() => { api("/platform/plans").then((response) => response.ok ? response.json() : null).then((data) => setPlans(data?.plans || [])).catch(() => setPlans([])); }, []);
  // Los planes y el idioma cambian la altura de la página: hay que recalcular dónde empieza cada animación de scroll.
  useEffect(() => { if (plans) ScrollTrigger.refresh(); }, [plans, lang]);

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
        // Botones magnéticos y app inclinada que siguen el mouse en el hero.
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
      <div><p className="os-kicker" data-hero>{t.hero.kicker}</p><h1 data-hero>{t.hero.title} <em>{t.hero.titleAccent}</em></h1><p className="os-lead os-muted" data-hero>{t.hero.lead}</p>
        <div className="os-actions" data-hero><a className="os-btn os-btn-main" data-magnetic href="/registro">{t.hero.cta} <span className="arrow">→</span></a><a className="os-btn os-btn-ghost" data-magnetic href="#demo">{t.hero.demo}</a></div>
        <ul className="os-facts" data-hero>{t.hero.facts.map(([label, text], index) => <li key={index}><span>{label}</span>{text}</li>)}</ul></div>
      <div><HeroApp /></div></section>

    <section className="os-section os-light" id="nosotros"><p className="os-kicker" data-os-reveal>{t.about.kicker}</p><p className="os-manifesto">{t.about.manifesto.split(" ").map((word, index) => <span className="w" key={index}>{word}</span>)}</p>
      <div className="os-about"><div className="os-about-lead" data-os-reveal><h3>{t.about.visionTitle}</h3><p>{t.about.vision}</p></div>
        <ol className="os-principles">{t.about.values.map(([number, title, text], index) => <li data-os-reveal key={index}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>

    <section className="os-section os-dark os-how"><div><p className="os-kicker">{t.how.kicker}</p><h2>{t.how.title}</h2><p className="os-muted">{t.how.lead}</p><div className="os-steps">{t.how.steps.map(([title, text], index) => <div className={`os-step ${step === index ? "on" : ""}`} key={index}><b>{index + 1}</b><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div><Phone step={step} /></section>

    <section className="os-section os-dark" id="funciones" onPointerMove={spotlight}><div className="os-head"><p className="os-kicker" data-os-reveal>{t.features.kicker}</p><h2 data-os-reveal>{t.features.title}</h2></div><div className="os-bento">{t.features.items.map(([title, text], index) => <article className="os-feat" data-os-reveal key={index}><span className="num">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="os-soon os-muted">{t.features.soon}</p></section>

    <section className="os-section os-light" id="demo"><div className="os-head"><p className="os-kicker" data-os-reveal>{t.demo.kicker}</p><h2 data-os-reveal>{t.demo.title}</h2><p className="os-muted" data-os-reveal>{t.demo.lead}</p></div><div className="os-split"><div data-os-reveal><Demo /></div><div data-os-reveal><Calculator plans={plans || []} /></div></div></section>

    <section className="os-section os-light" id="precios" style={{ paddingTop: 0 }}><div className="os-head"><p className="os-kicker" data-os-reveal>{t.pricing.kicker}</p><h2 data-os-reveal>{t.pricing.title}</h2></div><div data-os-reveal><Pricing plans={plans} /></div></section>

    <section className="os-section os-dark os-faq-wrap" id="preguntas"><div className="os-head"><p className="os-kicker" data-os-reveal>{t.faq.kicker}</p><h2 data-os-reveal>{t.faq.title}</h2></div><div className="os-faq">{t.faq.items.map(([question, answer], index) => <details key={index} data-os-reveal><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <div className="os-dark"><section className="os-cta" data-os-reveal><div><h2>{t.cta.title}</h2><p>{t.cta.lead}</p></div><a className="os-btn os-btn-main" data-magnetic href="/registro">{t.cta.button} <span className="arrow">→</span></a></section></div>
  </main>;
}
