"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export const THEMES = [["callejero", "Callejero", "Asfalto, amarillo de señal y letras de cartel."], ["clasico", "Clásico", "Madera, dorado y letra de barbería antigua."], ["minimal", "Minimal", "Fondo claro, negro y limpio."]];

// Carga la barbería de la URL (/<slug>/...). missing trae el mensaje si no existe o no ha pagado.
export function useShop() {
  const { shop: slug } = useParams();
  const [shop, setShop] = useState(null), [missing, setMissing] = useState("");
  useEffect(() => {
    api(`/shops/${slug}`).then(async (response) => { const data = await response.json(); if (!response.ok) return setMissing(data.message || "Barbería no encontrada."); setShop(data); document.title = `${data.name} | Reservas`; }).catch(() => setMissing("No pudimos conectar con el servidor. Intenta de nuevo en un momento."));
  }, [slug]);
  return { slug, shop, setShop, missing };
}

// Atributos del <main> que aplican el tema y el color de acento de la barbería.
export const themeProps = (shop) => ({ "data-theme": shop?.theme || "callejero", style: shop?.accent ? { "--red": shop.accent } : undefined });

// "Legacy Barber" → Legacy <span>Barber</span>: la primera palabra en letra de cartel y el resto en la letra del tema.
export function Brand({ name, href, logo }) {
  const [first, ...rest] = name.split(" ");
  return <a className="brand" href={href}>{logo && <img className="brand-logo" src={logo} alt="" />}{first}{rest.length > 0 && <span>{rest.join(" ")}</span>}</a>;
}

export function ShopState({ message }) {
  return <main className="utility-page"><header className="topbar"><a className="brand" href="/">Barber<span>OS</span></a></header><section className="utility-content"><p className="eyebrow">{message ? "UPS" : "CARGANDO"}</p><h1>{message ? <>Aquí no hay<br /><em>barbería.</em></> : "…"}</h1>{message && <p className="lead">{message}</p>}</section></main>;
}
