// Precios de BarberOS por moneda (precios fijos, no conversión). Se cambian aquí: el frontend los lee de GET /api/platform/plans
// y el cobro se calcula siempre en el servidor con estos valores. COP es la moneda principal.
export const CURRENCIES = ['COP', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PLANS = {
  basico: {
    name: { es: 'Básico', en: 'Basic' }, barbers: 1,
    monthly: { COP: 59900, USD: 15, EUR: 14 },
    features: { es: ['1 barbero', 'Reservas en línea 24/7', 'Carta de servicios y precios', 'Panel de agenda'], en: ['1 barber', 'Online booking 24/7', 'Service menu and prices', 'Schedule dashboard'] },
  },
  pro: {
    name: { es: 'Pro', en: 'Pro' }, barbers: 5,
    monthly: { COP: 119900, USD: 29, EUR: 27 },
    features: { es: ['Hasta 5 barberos', 'Todo lo del Básico', 'Agenda y bloqueos por barbero', 'Reprogramación de citas'], en: ['Up to 5 barbers', 'Everything in Basic', 'Per-barber schedule and time blocks', 'Appointment rescheduling'] },
  },
  full: {
    name: { es: 'Full', en: 'Full' }, barbers: null,
    monthly: { COP: 199900, USD: 49, EUR: 45 },
    features: { es: ['Barberos ilimitados', 'Todo lo del Pro', 'Soporte prioritario', 'Ideal para cadenas'], en: ['Unlimited barbers', 'Everything in Pro', 'Priority support', 'Built for chains'] },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PERIODS = { MONTHLY: { label: 'Mensual', months: 1 }, YEARLY: { label: 'Anual', months: 12 } } as const;
export type Period = keyof typeof PERIODS;

// Anual = 10 meses (2 meses gratis). En la moneda pedida, en unidades enteras (pesos, dólares, euros).
export const priceOf = (plan: PlanId, period: Period, currency: Currency = 'COP') => PLANS[plan].monthly[currency] * (period === 'YEARLY' ? 10 : 1);
// Wompi y Stripe reciben el monto en la unidad menor (centavos): ×100 en las tres monedas.
export const toMinor = (amount: number) => Math.round(amount * 100);
// Wompi solo cobra en pesos colombianos; el resto del mundo paga con Stripe.
export const providerFor = (currency: Currency) => (currency === 'COP' ? 'wompi' : 'stripe');
