// Precios de referencia de BarberOS en COP. Se cambian aquí: el frontend los lee de GET /api/platform/plans
// y el cobro se calcula siempre en el servidor con estos valores.
export const PLANS = {
  basico: { name: 'Básico', barbers: 1, monthly: 59900, features: ['1 barbero', 'Reservas en línea 24/7', 'Carta de servicios y precios', 'Panel de agenda'] },
  pro: { name: 'Pro', barbers: 5, monthly: 119900, features: ['Hasta 5 barberos', 'Todo lo del Básico', 'Agenda y bloqueos por barbero', 'Reprogramación de citas'] },
  full: { name: 'Full', barbers: null, monthly: 199900, features: ['Barberos ilimitados', 'Todo lo del Pro', 'Soporte prioritario', 'Ideal para cadenas'] },
} as const;

export type PlanId = keyof typeof PLANS;
export const PERIODS = { MONTHLY: { label: 'Mensual', months: 1 }, YEARLY: { label: 'Anual', months: 12 } } as const;
export type Period = keyof typeof PERIODS;

// Anual = 10 meses (2 meses gratis).
export const priceOf = (plan: PlanId, period: Period) => PLANS[plan].monthly * (period === 'YEARLY' ? 10 : 1);
