import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BarbershopStatus, PaymentStatus } from '.prisma/platform';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { hashPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../tenancy/tenant.service';
import { CURRENCIES, Currency, PERIODS, PLANS, Period, PlanId, priceOf, providerFor, toMinor } from './plans';

type WompiTransaction = { id: string; reference: string; status: string; amount_in_cents: number; currency: string };
type RegisterInput = { name: string; ownerName: string; email: string; phone: string; city: string; password: string; plan: PlanId; period: Period; currency?: Currency };

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'barberia';
const FINAL = new Set(['APPROVED', 'DECLINED', 'VOIDED', 'ERROR']);
// Rutas propias de BarberOS: una barbería no puede quedar con estas direcciones.
const RESERVED = new Set(['admin', 'registro', 'software', 'api']);

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly tenants: TenantService) {}

  private get wompi() { return { publicKey: process.env.WOMPI_PUBLIC_KEY, integrity: process.env.WOMPI_INTEGRITY_SECRET, events: process.env.WOMPI_EVENTS_SECRET, api: process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1' }; }
  // Una pasarela está lista cuando tiene sus llaves. Stripe (USD/EUR) llega en la etapa 4: hasta entonces nunca está lista.
  private ready(currency: Currency) { return providerFor(currency) === 'wompi' ? !!this.wompi.publicKey : !!process.env.STRIPE_SECRET_KEY; }
  // Sin llaves de la pasarela (y fuera de producción) el cobro pasa por una pasarela simulada para poder probar el flujo.
  demoFor(currency: Currency) { return !this.ready(currency) && process.env.NODE_ENV !== 'production'; }
  private get site() { return process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000'; }

  plans() {
    return {
      currencies: CURRENCIES,
      plans: Object.entries(PLANS).map(([id, plan]) => ({ id, name: plan.name, barbers: plan.barbers, features: plan.features, prices: Object.fromEntries(CURRENCIES.map((c) => [c, { monthly: priceOf(id as PlanId, 'MONTHLY', c), yearly: priceOf(id as PlanId, 'YEARLY', c) }])) })),
      demo: Object.fromEntries(CURRENCIES.map((c) => [c, this.demoFor(c)])),
    };
  }

  async register(input: RegisterInput) {
    const currency = input.currency ?? 'COP';
    if (!this.ready(currency) && !this.demoFor(currency)) throw new BadRequestException('Los pagos en esta moneda no están configurados todavía.');
    const email = input.email.trim().toLowerCase();
    // La moneda del registro queda como moneda de la carta de la barbería (la puede cambiar en su panel).
    const data = { name: input.name.trim(), ownerName: input.ownerName.trim(), email, phone: input.phone.replace(/\D/g, ''), city: input.city.trim(), plan: input.plan, currency, passwordHash: hashPassword(input.password) };
    // Si la misma barbería ya se registró y no terminó de pagar, se reutiliza en vez de duplicarla.
    const pending = await this.prisma.barbershop.findFirst({ where: { email, name: data.name, status: BarbershopStatus.PENDING_PAYMENT } });
    const shop = pending ? await this.prisma.barbershop.update({ where: { id: pending.id }, data }) : await this.prisma.barbershop.create({ data: { ...data, slug: await this.freeSlug(data.name) } });
    const amountInCents = toMinor(priceOf(input.plan, input.period, currency));
    const payment = await this.prisma.payment.create({ data: { reference: `BOS-${Date.now()}-${randomBytes(3).toString('hex')}`, barbershopId: shop.id, plan: input.plan, period: input.period, amountInCents, currency, provider: providerFor(currency) } });
    return { barbershop: { id: shop.id, name: shop.name, slug: shop.slug }, reference: payment.reference, checkoutUrl: this.checkoutUrl(payment.reference, amountInCents, currency, shop) };
  }

  // La licencia se cobra en la moneda del último pago aprobado (la de la carta puede ser otra: la cambia la barbería en su panel).
  async billingCurrency(shop: { id: string; currency: string }): Promise<Currency> {
    const last = await this.prisma.payment.findFirst({ where: { barbershopId: shop.id, status: PaymentStatus.APPROVED }, orderBy: { createdAt: 'desc' }, select: { currency: true } });
    const currency = (last?.currency ?? shop.currency) as Currency;
    return CURRENCIES.includes(currency) ? currency : 'COP';
  }

  // Renovar (o cambiar de plan) desde el panel de una barbería que ya pagó alguna vez. Crea otro pago sobre la misma barbería:
  // al aprobarse, applyTransaction suma el periodo a partir del vencimiento actual (o de hoy si ya venció) y aplica el plan elegido.
  async renew(shopId: string, plan: PlanId, period: Period) {
    const shop = await this.prisma.barbershop.findUnique({ where: { id: shopId } });
    if (!shop || shop.status !== BarbershopStatus.ACTIVE) throw new NotFoundException('Barbería no encontrada.');
    const currency = await this.billingCurrency(shop);
    if (!this.ready(currency) && !this.demoFor(currency)) throw new BadRequestException('Los pagos en esta moneda no están configurados todavía.');
    // No se puede bajar a un plan con menos barberos de los que hoy atienden: primero hay que retirar los que sobran.
    const cap = PLANS[plan].barbers;
    if (cap) {
      const active = await (await this.tenants.client(shopId)).barber.count({ where: { active: true } });
      if (active > cap) throw new BadRequestException(`El plan ${PLANS[plan].name.es} permite hasta ${cap} barbero${cap > 1 ? 's' : ''} y tienes ${active} activos. Retira ${active - cap} antes de cambiar de plan.`);
    }
    const amountInCents = toMinor(priceOf(plan, period, currency));
    // BOS-R: la R marca el pago como renovación para que la página de resultado no lo presente como un registro nuevo.
    const payment = await this.prisma.payment.create({ data: { reference: `BOS-R-${Date.now()}-${randomBytes(3).toString('hex')}`, barbershopId: shop.id, plan, period, amountInCents, currency, provider: providerFor(currency) } });
    return { reference: payment.reference, amountInCents, currency, checkoutUrl: this.checkoutUrl(payment.reference, amountInCents, currency, shop) };
  }

  private async freeSlug(name: string) {
    const base = slugify(name);
    for (let n = 1; ; n++) { const slug = n === 1 ? base : `${base}-${n}`; if (!RESERVED.has(slug) && !(await this.prisma.barbershop.findUnique({ where: { slug } }))) return slug; }
  }

  private checkoutUrl(reference: string, amountInCents: number, currency: Currency, shop: { email: string; ownerName: string }) {
    const redirect = `${this.site}/registro/resultado`;
    if (this.demoFor(currency)) return `${this.site}/registro/pago-demo?reference=${reference}`;
    if (providerFor(currency) === 'stripe') throw new BadRequestException('El pago con Stripe todavía no está disponible.'); // etapa 4
    const params = new URLSearchParams({ 'public-key': this.wompi.publicKey!, currency: 'COP', 'amount-in-cents': String(amountInCents), reference, 'signature:integrity': sha256(`${reference}${amountInCents}COP${this.wompi.integrity}`), 'redirect-url': redirect, 'customer-data:email': shop.email, 'customer-data:full-name': shop.ownerName });
    return `https://checkout.wompi.co/p/?${params}`;
  }

  // Único lugar donde un pago cambia de estado: lo usan el webhook, la consulta a Wompi y el modo demo.
  async applyTransaction(tx: WompiTransaction) {
    const payment = await this.prisma.payment.findUnique({ where: { reference: tx.reference }, include: { barbershop: true } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (tx.amount_in_cents !== payment.amountInCents || tx.currency !== payment.currency) { this.logger.warn(`Monto o moneda no coinciden en ${tx.reference}`); throw new BadRequestException('La transacción no coincide con el pago.'); }
    if (payment.status !== PaymentStatus.PENDING || !FINAL.has(tx.status)) return this.status(payment.reference); // idempotente y sin estados intermedios
    await this.prisma.$transaction(async (db) => {
      // El webhook y la consulta desde la página de resultado pueden llegar a la vez: solo el que logra pasar el pago
      // de PENDING a su estado final extiende la licencia; el otro no hace nada.
      const claimed = await db.payment.updateMany({ where: { id: payment.id, status: PaymentStatus.PENDING }, data: { status: tx.status as PaymentStatus, providerTransactionId: tx.id } });
      if (!claimed.count || tx.status !== 'APPROVED') return;
      const shop = await db.barbershop.findUniqueOrThrow({ where: { id: payment.barbershopId }, select: { paidUntil: true } });
      const from = shop.paidUntil && shop.paidUntil > new Date() ? shop.paidUntil : new Date();
      const paidUntil = new Date(from); paidUntil.setMonth(paidUntil.getMonth() + PERIODS[payment.period as Period].months);
      await db.barbershop.update({ where: { id: payment.barbershopId }, data: { status: BarbershopStatus.ACTIVE, plan: payment.plan, paidUntil } });
    });
    // Con el pago aprobado la barbería recibe su propia base (si ya existe, solo se verifican sus migraciones).
    if (tx.status === 'APPROVED') await this.tenants.provision(payment.barbershopId);
    return this.status(payment.reference);
  }

  async status(reference: string) {
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { barbershop: true } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    const { barbershop: shop } = payment;
    return { reference, renewal: reference.startsWith('BOS-R-'), status: payment.status, plan: payment.plan, period: payment.period, amountInCents: payment.amountInCents, currency: payment.currency, provider: payment.provider, barbershop: { name: shop.name, slug: shop.slug, status: shop.status, paidUntil: shop.paidUntil } };
  }

  // La redirección de Wompi trae ?id=; se confirma preguntándole a Wompi, nunca creyéndole al navegador.
  async sync(transactionId: string) {
    const response = await fetch(`${this.wompi.api}/transactions/${encodeURIComponent(transactionId)}`);
    if (!response.ok) throw new NotFoundException('Wompi no reconoce esa transacción.');
    const { data } = (await response.json()) as { data: WompiTransaction };
    return this.applyTransaction(data);
  }

  async webhook(event: { event: string; data: Record<string, any>; signature?: { properties: string[]; checksum: string }; timestamp: number }, header?: string) {
    const { signature } = event;
    if (!signature || !this.wompi.events) throw new UnauthorizedException('Evento sin firma.');
    const values = signature.properties.map((path) => path.split('.').reduce((value: any, key) => value?.[key], event.data)).join('');
    const expected = sha256(`${values}${event.timestamp}${this.wompi.events}`);
    if (expected !== signature.checksum.toLowerCase() || (header && header.toLowerCase() !== expected)) throw new UnauthorizedException('Firma inválida.');
    if (event.event === 'transaction.updated') await this.applyTransaction(event.data.transaction);
    return { ok: true };
  }

  async demoPay(reference: string, status: 'APPROVED' | 'DECLINED') {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (!this.demoFor(payment.currency as Currency)) throw new ForbiddenException('El modo demo está apagado.');
    return this.applyTransaction({ id: `demo-${reference}`, reference, status, amount_in_cents: payment.amountInCents, currency: payment.currency });
  }

  async login(password: string) {
    const expected = process.env.PLATFORM_PASSWORD;
    // Se comparan los hashes en tiempo constante para no filtrar la clave por el tiempo de respuesta.
    if (!expected || !timingSafeEqual(createHash('sha256').update(password).digest(), createHash('sha256').update(expected).digest())) throw new UnauthorizedException('Contraseña incorrecta.');
    return { accessToken: await this.jwt.signAsync({ role: 'platform' }) };
  }

  barbershops() { return this.prisma.barbershop.findMany({ omit: { passwordHash: true }, include: { payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } }); }
}
