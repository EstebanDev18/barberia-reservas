"use client";

// Idioma (ES/EN) y moneda (COP/USD/EUR) de BarberOS. Solo BarberOS se traduce: las páginas de cada barbería siguen en español.
// La elección se guarda en cookies (el servidor las lee para pintar la página ya en el idioma correcto, sin parpadeo).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CURRENCIES, formatMoney } from "@/lib/money";
import { CURRENCY_COOKIE, LANG_COOKIE, LANGS, defaultCurrencyFor } from "./prefs";

export { LANGS };
const plural = (n, one, many) => (n === 1 ? one : many);

const es = {
  locale: "es-CO",
  nav: { about: "Quiénes somos", features: "Funciones", pricing: "Precios", register: "Registrar mi barbería", language: "Idioma", currency: "Moneda" },
  footer: { blurb: "El sistema operativo de tu barbería: reservas en línea, agenda por barbero y tu carta de precios en un solo lugar.", product: "Producto", company: "Empresa", shops: "Barberías", features: "Funciones", demo: "Pruébalo", pricing: "Precios", register: "Registrar mi barbería", about: "Quiénes somos", faq: "Preguntas frecuentes", access: "Acceso BarberOS", secure: "Pagos seguros con Wompi y Stripe" },
  hero: { kicker: "Software de reservas para barberías", title: "Tu agenda se llena", titleAccent: "mientras tú cortas.", lead: "Reservas en línea, agenda por barbero y tu carta de precios en un solo lugar. Tus clientes apartan su silla en 3 pasos; tú dejas de cuadrar turnos por WhatsApp.", cta: "Registrar mi barbería", demo: "Pruébalo en vivo",
    facts: [["Cliente", "Reserva desde un link, sin instalar nada ni crear cuenta."], ["Cambios", "Mueve o cancela su cita hasta 2 horas antes."], ["Licencia", "Pagas en línea y la barbería queda activa al instante."]] },
  app: { title: "Agenda", live: "En vivo", today: "Hoy", summary: "4 citas · 2 barberos", blocked: "Bloqueado",
    agenda: [["9:00", "Andrés P.", "Corte y barba", "Kevin"], ["10:30", "Camilo R.", "Solo corte", "Esteban"], ["12:00", "Almuerzo", "Bloqueado", "Kevin"], ["3:30", "Santiago M.", "Barba", "Esteban"]],
    toasts: [["+", "Nueva reserva", "Juan D. · Solo corte · 4:00 p.m."], ["↻", "Cita reprogramada", "Andrés pasó a las 11:00 a.m."], ["✓", "Corte completado", "Santiago M. · Barba"]] },
  about: { kicker: "Quiénes somos", manifesto: "Nacimos viendo el día a día de una barbería de verdad: el cliente que llama mientras estás cortando, el turno que se cruzó, el almuerzo que nunca llega a tiempo. BarberOS existe para que cada barbero dedique su tiempo a cortar, no a cuadrar agendas.", visionTitle: "Hacia dónde vamos", vision: "Que cualquier barbería, grande o pequeña, tenga las herramientas de una cadena, a un precio que se pague solo con un par de cortes al mes.",
    values: [["01", "Hecho para el gremio", "Pensado con la rutina real de una barbería: turnos, almuerzos, clientes fijos y días a reventar."], ["02", "Simple de verdad", "Si tu cliente sabe usar WhatsApp, sabe reservar. Si tú sabes cortar, sabes usar el panel."], ["03", "Tus datos son tuyos", "Cada barbería tiene su propia base de datos. Tus clientes y tu agenda no se mezclan con los de nadie, y no los vendemos ni los compartimos."]] },
  how: { kicker: "Cómo funciona", title: "Reservar toma tres toques", lead: "Así lo vive tu cliente desde el celular.",
    steps: [["El cliente elige", "Servicio y barbero desde su celular, sin crear cuenta: solo nombre y teléfono."], ["Escoge la hora", "Solo ve horas libres de verdad. Nunca quedan dos clientes en la misma silla."], ["Queda confirmado", "Recibe su código y puede mover o cancelar la cita hasta 2 horas antes."]],
    phone: { what: "¿Qué te vas a hacer?", who: "¿Quién te corta?", day: "Martes 21 de octubre", onlyFree: "Solo ves horas libres de verdad.", done: "¡Listo, Camilo!", service: "Servicio", barber: "Barbero", time: "Hora", code: "Código", when: "Mar 21 · 10:30", styles: ["Fades", "Clásico"] } },
  features: { kicker: "Funciones", title: "Lo que pasa en tu barbería, en un solo panel", soon: "Próximamente: recordatorios automáticos por correo y WhatsApp.",
    items: [["Reservas 24/7", "Tus clientes apartan su silla a cualquier hora, desde un link. Sin apps que instalar."], ["Agenda por barbero", "Cada barbero con su agenda; los choques de horario son imposibles."], ["Bloqueos de horario", "Almuerzo, vacaciones o una diligencia: bloqueas el rato y nadie lo reserva."], ["Reprogramar y cancelar", "El cliente mueve su cita solo, sin escribirte por WhatsApp."], ["Tu carta, tus precios", "Servicios, precios y duraciones editables desde el panel, en pesos, dólares o euros."], ["Panel del equipo", "El día completo o filtrado por barbero; agregas y retiras gente en segundos."], ["Pagos seguros", "Tu licencia se paga en línea: Wompi en Colombia y tarjeta internacional en dólares o euros."]] },
  demo: { kicker: "Pruébalo", title: "Pruébalo antes de pagar", lead: "Haz una reserva de prueba y calcula cuánto te cuesta cada corte con tu equipo.",
    bookTitle: "Reserva como un cliente", bookLead: "Así ven tus clientes BarberOS. Es una demo: no se guarda nada.", service: "Servicio", barber: "Barbero", time: "Hora de mañana", confirm: "Confirmar reserva de prueba", booked: "¡Turno apartado!", tomorrow: "mañana", with: "con",
    services: ["Solo corte", "Corte y barba", "Barba"], prices: { COP: [30000, 45000, 20000], USD: [12, 18, 8], EUR: [11, 17, 7] },
    calcTitle: "¿Cuánto te cuesta por corte?", calcLead: "Mueve los controles y te decimos qué plan te sirve.", team: "Barberos en tu equipo", barbers: (n) => plural(n, "barbero", "barberos"), perDay: "Cortes por barbero al día", day: "al día", recommended: "Plan recomendado", perCut: "por corte", month: "al mes", cutsMonth: "cortes/mes" },
  pricing: { kicker: "Precios", title: "Pagas según tu equipo, no por reserva", monthly: "Mensual", yearly: "Anual", yearlyDeal: "−2 meses", perMonth: "/mes", perYear: "/año", equals: (v) => `Equivale a ${v} al mes`, noLockIn: "Sin permanencia", choose: (name) => `Elegir ${name}`, recommended: "Recomendado", loading: "Cargando planes…", failed: "No pudimos cargar los precios. Intenta de nuevo en un momento.", upTo: (n) => `Hasta ${n} ${plural(n, "barbero", "barberos")}`, unlimited: "Barberos ilimitados",
    fine: { COP: "Valores en pesos colombianos. Pagas con tarjeta, PSE, Nequi o Bancolombia a través de Wompi.", USD: "Valores en dólares estadounidenses. Pagas con tarjeta internacional.", EUR: "Valores en euros. Pagas con tarjeta internacional." } },
  faq: { kicker: "Preguntas frecuentes", title: "Lo que más nos preguntan",
    items: [["¿Tengo que instalar algo?", "No. BarberOS funciona en el navegador del celular o del computador. Tus clientes reservan desde un link."], ["¿Mis clientes necesitan crear una cuenta?", "No. Para reservar solo dejan su nombre y su teléfono; con ese teléfono consultan, mueven o cancelan su cita."], ["¿Cómo pago la licencia?", "En línea. En Colombia con Wompi (tarjeta, PSE, Nequi o Bancolombia) y desde otros países con tarjeta en dólares o euros. Apenas el pago queda aprobado, tu barbería se activa."], ["¿Qué plan me sirve?", "Depende de cuántos barberos tienes: Básico para uno, Pro hasta cinco y Full sin límite. La calculadora de arriba te lo dice."]] },
  cta: { title: "Tu barbería, sin filas y sin cuentos.", lead: "Elige tu plan, paga en línea y empieza a recibir reservas hoy.", button: "Registrar mi barbería" },
  plans: { basico: "Básico", pro: "Pro", full: "Full" },
  period: { MONTHLY: "Mensual", YEARLY: "Anual" },
  register: { kicker: "Registrar mi barbería", title: "Activa tu barbería en minutos", steps: ["Plan", "Tu barbería", "Revisar y pagar"],
    planTitle: "Elige tu plan", planLead: "Puedes empezar con uno y cambiar cuando tu equipo crezca.",
    shopTitle: "Cuéntanos de tu barbería", shopLead: "Con estos datos registramos tu barbería en BarberOS. La contraseña es para entrar a tu panel.",
    fields: { name: ["Nombre de la barbería", "Ej. Legacy Barber"], ownerName: ["Tu nombre", "Ej. Andrés Pérez"], email: ["Correo", "tu@correo.com"], phone: ["Celular", "Ej. 300 123 4567"], city: ["Ciudad", "Ej. Barranquilla"], password: ["Contraseña de tu panel", "Mínimo 8 caracteres"] },
    hints: { name: "Escribe el nombre de tu barbería.", ownerName: "Escribe tu nombre.", email: "Revisa el correo, parece incompleto.", phone: "El celular debe tener al menos 7 números.", city: "¿En qué ciudad está?", password: "Usa al menos 8 caracteres." },
    reviewTitle: "Revisa y paga", reviewLead: { wompi: "Al pagar te llevamos a Wompi. Apenas se apruebe, tu barbería queda activa.", stripe: "Al pagar te llevamos al pago con tarjeta. Apenas se apruebe, tu barbería queda activa." },
    plan: "Plan", shop: "Barbería", owner: "Responsable", change: "Cambiar", edit: "Editar", methods: { COP: ["Tarjeta", "PSE", "Nequi", "Bancolombia"], USD: ["Visa", "Mastercard", "American Express"], EUR: ["Visa", "Mastercard", "American Express"] }, methodsLabel: "Medios de pago",
    demoNote: "Modo demo: aún no hay llaves de la pasarela, así que el pago se simula.", back: "← Atrás", seePrices: "Ver precios", next: "Continuar", connecting: "Conectando con la pasarela…", pay: (v) => `Pagar ${v}`,
    loadFailed: "No pudimos cargar los planes. Revisa tu conexión.", failed: "No fue posible registrar la barbería.",
    sideLabel: "Tu plan", save: (v) => `Ahorras ${v} frente a pagar mes a mes`,
    trust: [["Pago seguro", "Procesado por Wompi en Colombia y por Stripe en el resto del mundo. No guardamos datos de tu tarjeta."], ["Activación inmediata", "Tu barbería queda activa apenas se apruebe el pago."], ["Sin permanencia", "Pagas por periodo y renuevas cuando quieras."]] },
  result: { kicker: "Registro · Pago", titles: { APPROVED: "Tu barbería ya está activa", DECLINED: "El pago no pasó", VOIDED: "El pago fue anulado", ERROR: "Algo falló con el pago", PENDING: "Confirmando tu pago" }, failedTitle: "No pudimos confirmar el pago", failed: "No pudimos confirmar el pago.",
    faq: "Ver preguntas frecuentes", backToRegister: "Volver al registro", pending: "Estamos confirmando la transacción con la pasarela de pago. Puede tardar unos segundos; no cierres esta página.",
    registered: (name) => [name, " quedó registrada y lista para recibir reservas."], plan: "Plan", validUntil: "Licencia vigente hasta", page: "Tu página", reference: "Referencia",
    next: [["Entra a tu panel", "Con la contraseña que creaste en el registro."], ["Arma tu carta y tu equipo", "Servicios, precios, barberos y horarios."], ["Comparte tu link", "En Instagram, WhatsApp o en un código QR en la barbería."]],
    seePage: "Ver mi página ↗", enterPanel: "Entrar a mi panel", notActivated: "Tu barbería no se activó porque el pago no se aprobó. No se te cobró nada; puedes intentarlo de nuevo con otro medio de pago.", seePlans: "Ver planes", retry: "Intentar de nuevo" },
  demoPay: { tag: "Modo demo", kicker: "Pasarela de prueba", title: "Simula el pago", lead: "Todavía no hay llaves de la pasarela de pago configuradas, así que este paso reemplaza el checkout real. No se cobra nada.", shop: "Barbería", plan: "Plan", reference: "Referencia", total: "Total", notFound: "No encontramos ese pago. Vuelve al registro e inténtalo de nuevo.", missing: "Falta la referencia del pago.", failed: "No fue posible procesar el pago.", processing: "Procesando…", decline: "Simular rechazo", approve: "Simular pago aprobado" },
  admin: { kicker: "Plataforma", loginTitle: "Panel de la plataforma", loginLead: "Todas las barberías que usan el software, el estado de su licencia y su último pago.", loginFacts: [["Barberías", "Registro y datos de contacto"], ["Licencias", "Activas, pendientes y vencidas"], ["Pagos", "Último cobro de cada una"]], signIn: "Iniciar sesión", password: "Contraseña", passwordHelp: "Se configura con la variable PLATFORM_PASSWORD del servidor.", enter: "Entrar", wrong: "Contraseña incorrecta.", loadFailed: "No fue posible cargar las barberías.",
    title: "Barberías registradas", kpis: ["Registradas", "Licencia activa", "Pendientes de pago", "Ingresos aprobados"], filters: [["", "Todas"], ["activa", "Activas"], ["pendiente", "Pendientes"], ["vencida", "Vencidas"]], filterLabel: "Filtrar por licencia", search: "Buscar barbería, dueño, correo o ciudad", searchLabel: "Buscar",
    columns: ["Barbería", "Responsable", "Plan", "Licencia", "Último pago"], noPayments: "Sin pagos", emptyTitle: "No hay barberías con ese filtro", emptyLead: "Prueba con otro estado o borra la búsqueda.", seeAll: "Ver todas",
    license: { pendiente: "Pendiente de pago", activa: (d) => `Activa hasta ${d}`, vencida: (d) => `Vencida el ${d}` }, payment: { APPROVED: "aprobado", PENDING: "pendiente", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "con error" }, noRevenue: "—" },
};

const en = {
  locale: "en-US",
  nav: { about: "About", features: "Features", pricing: "Pricing", register: "Register my barbershop", language: "Language", currency: "Currency" },
  footer: { blurb: "The operating system for your barbershop: online booking, per-barber schedules and your price menu in one place.", product: "Product", company: "Company", shops: "Barbershops", features: "Features", demo: "Try it", pricing: "Pricing", register: "Register my barbershop", about: "About", faq: "FAQ", access: "BarberOS sign-in", secure: "Secure payments with Wompi and Stripe" },
  hero: { kicker: "Booking software for barbershops", title: "Your schedule fills up", titleAccent: "while you cut.", lead: "Online booking, per-barber schedules and your price menu in one place. Clients book their chair in 3 steps; you stop juggling appointments over WhatsApp.", cta: "Register my barbershop", demo: "Try it live",
    facts: [["Clients", "Book from a link, no app to install and no account to create."], ["Changes", "They can move or cancel up to 2 hours before."], ["License", "Pay online and your barbershop goes live instantly."]] },
  app: { title: "Schedule", live: "Live", today: "Today", summary: "4 appointments · 2 barbers", blocked: "Blocked",
    agenda: [["9:00", "Andrés P.", "Cut and beard", "Kevin"], ["10:30", "Camilo R.", "Haircut", "Esteban"], ["12:00", "Lunch", "Blocked", "Kevin"], ["3:30", "Santiago M.", "Beard", "Esteban"]],
    toasts: [["+", "New booking", "Juan D. · Haircut · 4:00 p.m."], ["↻", "Appointment moved", "Andrés moved to 11:00 a.m."], ["✓", "Cut completed", "Santiago M. · Beard"]] },
  about: { kicker: "About", manifesto: "We started by watching a real barbershop day to day: the client who calls while you're cutting, the double-booked slot, the lunch break that never comes on time. BarberOS exists so every barber spends their time cutting, not juggling a schedule.", visionTitle: "Where we're headed", vision: "Give every barbershop, big or small, the tools of a chain, at a price that pays for itself with a couple of cuts a month.",
    values: [["01", "Built for the trade", "Designed around a real barbershop routine: shifts, lunch breaks, regulars and packed days."], ["02", "Actually simple", "If your client can use WhatsApp, they can book. If you can cut, you can use the dashboard."], ["03", "Your data is yours", "Every barbershop gets its own database. Your clients and schedule never mix with anyone else's, and we never sell or share them."]] },
  how: { kicker: "How it works", title: "Booking takes three taps", lead: "This is what your client sees on their phone.",
    steps: [["The client chooses", "Service and barber from their phone, no account needed: just name and phone number."], ["Picks a time", "They only see slots that are actually free. Two clients never end up in the same chair."], ["It's confirmed", "They get a code and can move or cancel up to 2 hours before."]],
    phone: { what: "What are you getting?", who: "Who's cutting?", day: "Tuesday, October 21", onlyFree: "Only truly free slots are shown.", done: "All set, Camilo!", service: "Service", barber: "Barber", time: "Time", code: "Code", when: "Tue 21 · 10:30", styles: ["Fades", "Classic"] } },
  features: { kicker: "Features", title: "Everything in your barbershop, in one dashboard", soon: "Coming soon: automatic email and WhatsApp reminders.",
    items: [["24/7 booking", "Clients book their chair any time from a link. No apps to install."], ["Per-barber schedule", "Each barber has their own schedule; double bookings can't happen."], ["Time blocks", "Lunch, vacation or an errand: block the time and nobody can book it."], ["Reschedule and cancel", "Clients move their own appointment without messaging you."], ["Your menu, your prices", "Services, prices and durations you edit from the dashboard, in pesos, dollars or euros."], ["Team dashboard", "The whole day or filtered by barber; add or remove people in seconds."], ["Secure payments", "Your license is paid online: Wompi in Colombia and international cards in dollars or euros."]] },
  demo: { kicker: "Try it", title: "Try it before you pay", lead: "Make a test booking and work out what each cut costs with your team.",
    bookTitle: "Book like a client", bookLead: "This is how your clients see BarberOS. It's a demo: nothing is saved.", service: "Service", barber: "Barber", time: "Tomorrow at", confirm: "Confirm test booking", booked: "Slot booked!", tomorrow: "tomorrow", with: "with",
    services: ["Haircut", "Cut and beard", "Beard"], prices: { COP: [30000, 45000, 20000], USD: [12, 18, 8], EUR: [11, 17, 7] },
    calcTitle: "What does each cut cost you?", calcLead: "Move the sliders and we'll tell you which plan fits.", team: "Barbers on your team", barbers: (n) => plural(n, "barber", "barbers"), perDay: "Cuts per barber per day", day: "per day", recommended: "Recommended plan", perCut: "per cut", month: "per month", cutsMonth: "cuts/month" },
  pricing: { kicker: "Pricing", title: "Pay for your team size, not per booking", monthly: "Monthly", yearly: "Yearly", yearlyDeal: "2 months free", perMonth: "/mo", perYear: "/yr", equals: (v) => `That's ${v} per month`, noLockIn: "No lock-in", choose: (name) => `Choose ${name}`, recommended: "Recommended", loading: "Loading plans…", failed: "We couldn't load prices. Please try again in a moment.", upTo: (n) => `Up to ${n} ${plural(n, "barber", "barbers")}`, unlimited: "Unlimited barbers",
    fine: { COP: "Prices in Colombian pesos. Pay by card, PSE, Nequi or Bancolombia through Wompi.", USD: "Prices in US dollars. Pay with any international card.", EUR: "Prices in euros. Pay with any international card." } },
  faq: { kicker: "FAQ", title: "What people ask us most",
    items: [["Do I need to install anything?", "No. BarberOS runs in the browser on any phone or computer. Your clients book from a link."], ["Do my clients need an account?", "No. They only leave their name and phone number; with that number they can check, move or cancel their appointment."], ["How do I pay for the license?", "Online. In Colombia through Wompi (card, PSE, Nequi or Bancolombia) and from anywhere else by card in dollars or euros. As soon as the payment is approved, your barbershop goes live."], ["Which plan is right for me?", "It depends on how many barbers you have: Basic for one, Pro for up to five and Full with no limit. The calculator above will tell you."]] },
  cta: { title: "Your barbershop, no lines, no hassle.", lead: "Pick your plan, pay online and start taking bookings today.", button: "Register my barbershop" },
  plans: { basico: "Basic", pro: "Pro", full: "Full" },
  period: { MONTHLY: "Monthly", YEARLY: "Yearly" },
  register: { kicker: "Register my barbershop", title: "Get your barbershop live in minutes", steps: ["Plan", "Your barbershop", "Review and pay"],
    planTitle: "Choose your plan", planLead: "Start with one and switch as your team grows.",
    shopTitle: "Tell us about your barbershop", shopLead: "We use this to register your barbershop on BarberOS. The password is for signing in to your dashboard.",
    fields: { name: ["Barbershop name", "e.g. Legacy Barber"], ownerName: ["Your name", "e.g. Andrés Pérez"], email: ["Email", "you@email.com"], phone: ["Mobile number", "e.g. +1 312 847 1928"], city: ["City", "e.g. Miami"], password: ["Dashboard password", "At least 8 characters"] },
    hints: { name: "Enter your barbershop's name.", ownerName: "Enter your name.", email: "Check the email, it looks incomplete.", phone: "The number needs at least 7 digits.", city: "Which city is it in?", password: "Use at least 8 characters." },
    reviewTitle: "Review and pay", reviewLead: { wompi: "We'll take you to Wompi to pay. As soon as it's approved, your barbershop goes live.", stripe: "We'll take you to the card checkout. As soon as it's approved, your barbershop goes live." },
    plan: "Plan", shop: "Barbershop", owner: "Owner", change: "Change", edit: "Edit", methods: { COP: ["Card", "PSE", "Nequi", "Bancolombia"], USD: ["Visa", "Mastercard", "American Express"], EUR: ["Visa", "Mastercard", "American Express"] }, methodsLabel: "Payment methods",
    demoNote: "Demo mode: payment gateway keys aren't set up yet, so the payment is simulated.", back: "← Back", seePrices: "See pricing", next: "Continue", connecting: "Connecting to checkout…", pay: (v) => `Pay ${v}`,
    loadFailed: "We couldn't load the plans. Check your connection.", failed: "We couldn't register the barbershop.",
    sideLabel: "Your plan", save: (v) => `You save ${v} compared to paying monthly`,
    trust: [["Secure payment", "Processed by Wompi in Colombia and Stripe everywhere else. We never store your card details."], ["Instant activation", "Your barbershop goes live as soon as the payment is approved."], ["No lock-in", "Pay per period and renew whenever you want."]] },
  result: { kicker: "Registration · Payment", titles: { APPROVED: "Your barbershop is live", DECLINED: "The payment didn't go through", VOIDED: "The payment was voided", ERROR: "Something went wrong with the payment", PENDING: "Confirming your payment" }, failedTitle: "We couldn't confirm the payment", failed: "We couldn't confirm the payment.",
    faq: "See FAQ", backToRegister: "Back to registration", pending: "We're confirming the transaction with the payment gateway. This can take a few seconds; please keep this page open.",
    registered: (name) => [name, " is registered and ready to take bookings."], plan: "Plan", validUntil: "License valid until", page: "Your page", reference: "Reference",
    next: [["Sign in to your dashboard", "With the password you created during registration."], ["Set up your menu and team", "Services, prices, barbers and hours."], ["Share your link", "On Instagram, WhatsApp or as a QR code in the shop."]],
    seePage: "View my page ↗", enterPanel: "Go to my dashboard", notActivated: "Your barbershop wasn't activated because the payment wasn't approved. You haven't been charged; you can try again with another payment method.", seePlans: "See plans", retry: "Try again" },
  demoPay: { tag: "Demo mode", kicker: "Test checkout", title: "Simulate the payment", lead: "Payment gateway keys aren't set up yet, so this step stands in for the real checkout. Nothing is charged.", shop: "Barbershop", plan: "Plan", reference: "Reference", total: "Total", notFound: "We couldn't find that payment. Go back to registration and try again.", missing: "The payment reference is missing.", failed: "We couldn't process the payment.", processing: "Processing…", decline: "Simulate decline", approve: "Simulate approved payment" },
  admin: { kicker: "Platform", loginTitle: "Platform dashboard", loginLead: "Every barbershop using the software, its license status and its latest payment.", loginFacts: [["Barbershops", "Registration and contact details"], ["Licenses", "Active, pending and expired"], ["Payments", "Latest charge for each one"]], signIn: "Sign in", password: "Password", passwordHelp: "Set with the server's PLATFORM_PASSWORD variable.", enter: "Sign in", wrong: "Wrong password.", loadFailed: "We couldn't load the barbershops.",
    title: "Registered barbershops", kpis: ["Registered", "Active license", "Pending payment", "Approved revenue"], filters: [["", "All"], ["activa", "Active"], ["pendiente", "Pending"], ["vencida", "Expired"]], filterLabel: "Filter by license", search: "Search barbershop, owner, email or city", searchLabel: "Search",
    columns: ["Barbershop", "Owner", "Plan", "License", "Latest payment"], noPayments: "No payments", emptyTitle: "No barbershops match this filter", emptyLead: "Try another status or clear the search.", seeAll: "Show all",
    license: { pendiente: "Pending payment", activa: (d) => `Active until ${d}`, vencida: (d) => `Expired on ${d}` }, payment: { APPROVED: "approved", PENDING: "pending", DECLINED: "declined", VOIDED: "voided", ERROR: "failed" }, noRevenue: "—" },
};

export const DICT = { es, en };

const OsContext = createContext(null);
const remember = (name, value) => { document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`; };

export function OsProvider({ initialLang, initialCurrency, children }) {
  const [lang, setLangState] = useState(initialLang), [currency, setCurrencyState] = useState(initialCurrency);
  // Primera visita (sin cookie): se toma el idioma del navegador y su moneda por defecto.
  useEffect(() => {
    if (document.cookie.includes(`${LANG_COOKIE}=`)) return;
    const guess = navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
    remember(LANG_COOKIE, guess); // se guarda: las siguientes visitas ya llegan pintadas en este idioma
    if (guess !== initialLang) { setLangState(guess); if (!document.cookie.includes(`${CURRENCY_COOKIE}=`)) { remember(CURRENCY_COOKIE, defaultCurrencyFor(guess)); setCurrencyState(defaultCurrencyFor(guess)); } }
  }, [initialLang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((value) => { if (LANGS.includes(value)) { remember(LANG_COOKIE, value); setLangState(value); } }, []);
  const setCurrency = useCallback((value) => { if (CURRENCIES.includes(value)) { remember(CURRENCY_COOKIE, value); setCurrencyState(value); } }, []);
  const value = useMemo(() => ({ lang, setLang, currency, setCurrency, t: DICT[lang], money: (amount, cur = currency) => formatMoney(amount, cur, lang), date: (value, options) => new Intl.DateTimeFormat(DICT[lang].locale, options).format(new Date(value)) }), [lang, currency, setLang, setCurrency]);
  return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOs() {
  const context = useContext(OsContext);
  if (!context) throw new Error("useOs() debe usarse dentro de <OsProvider>.");
  return context;
}
