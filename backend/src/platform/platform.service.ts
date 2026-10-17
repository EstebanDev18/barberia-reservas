import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BarbershopStatus, PaymentStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { hashPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';
import { PERIODS, PLANS, Period, PlanId, priceOf } from './plans';

type WompiTransaction = { id: string; reference: string; status: string; amount_in_cents: number; currency: string };
type RegisterInput = { name: string; ownerName: string; email: string; phone: string; city: string; password: string; plan: PlanId; period: Period };

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'barberia';
const FINAL = new Set(['APPROVED', 'DECLINED', 'VOIDED', 'ERROR']);
// Rutas propias de BarberOS: una barbería no puede quedar con estas direcciones.
const RESERVED = new Set(['admin', 'registro', 'software', 'api']);

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private get wompi() { return { publicKey: process.env.WOMPI_PUBLIC_KEY, integrity: process.env.WOMPI_INTEGRITY_SECRET, events: process.env.WOMPI_EVENTS_SECRET, api: process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1' }; }
  // Sin llaves de Wompi (y fuera de producción) el cobro pasa por una pasarela simulada para poder probar el flujo.
  get demoMode() { return !this.wompi.publicKey && process.env.NODE_ENV !== 'production'; }
  private get site() { return process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000'; }

  plans() { return { plans: Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan, yearly: priceOf(id as PlanId, 'YEARLY') })), demo: this.demoMode }; }

  async register(input: RegisterInput) {
    if (!this.wompi.publicKey && !this.demoMode) throw new BadRequestException('Los pagos no están configurados todavía.');
    const email = input.email.trim().toLowerCase();
    const data = { name: input.name.trim(), ownerName: input.ownerName.trim(), email, phone: input.phone.replace(/\D/g, ''), city: input.city.trim(), plan: input.plan, passwordHash: hashPassword(input.password) };
    // Si la misma barbería ya se registró y no terminó de pagar, se reutiliza en vez de duplicarla.
    const pending = await this.prisma.barbershop.findFirst({ where: { email, name: data.name, status: BarbershopStatus.PENDING_PAYMENT } });
    const shop = pending ? await this.prisma.barbershop.update({ where: { id: pending.id }, data }) : await this.prisma.barbershop.create({ data: { ...data, slug: await this.freeSlug(data.name) } });
    const amountInCents = priceOf(input.plan, input.period) * 100;
    const payment = await this.prisma.payment.create({ data: { reference: `BOS-${Date.now()}-${randomBytes(3).toString('hex')}`, barbershopId: shop.id, plan: input.plan, period: input.period, amountInCents } });
    return { barbershop: { id: shop.id, name: shop.name, slug: shop.slug }, reference: payment.reference, checkoutUrl: this.checkoutUrl(payment.reference, amountInCents, shop) };
  }

  private async freeSlug(name: string) {
    const base = slugify(name);
    for (let n = 1; ; n++) { const slug = n === 1 ? base : `${base}-${n}`; if (!RESERVED.has(slug) && !(await this.prisma.barbershop.findUnique({ where: { slug } }))) return slug; }
  }

  private checkoutUrl(reference: string, amountInCents: number, shop: { email: string; ownerName: string }) {
    const redirect = `${this.site}/registro/resultado`;
    if (this.demoMode) return `${this.site}/registro/pago-demo?reference=${reference}`;
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
      await db.payment.update({ where: { id: payment.id }, data: { status: tx.status as PaymentStatus, providerTransactionId: tx.id } });
      if (tx.status !== 'APPROVED') return;
      const from = payment.barbershop.paidUntil && payment.barbershop.paidUntil > new Date() ? payment.barbershop.paidUntil : new Date();
      const paidUntil = new Date(from); paidUntil.setMonth(paidUntil.getMonth() + PERIODS[payment.period as Period].months);
      await db.barbershop.update({ where: { id: payment.barbershopId }, data: { status: BarbershopStatus.ACTIVE, plan: payment.plan, paidUntil } });
    });
    return this.status(payment.reference);
  }

  async status(reference: string) {
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { barbershop: true } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    const { barbershop: shop } = payment;
    return { reference, status: payment.status, plan: payment.plan, period: payment.period, amountInCents: payment.amountInCents, barbershop: { name: shop.name, slug: shop.slug, status: shop.status, paidUntil: shop.paidUntil } };
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
    if (!this.demoMode) throw new ForbiddenException('El modo demo está apagado.');
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    return this.applyTransaction({ id: `demo-${reference}`, reference, status, amount_in_cents: payment.amountInCents, currency: payment.currency });
  }

  async login(password: string) {
    if (!process.env.PLATFORM_PASSWORD || password !== process.env.PLATFORM_PASSWORD) throw new UnauthorizedException('Contraseña incorrecta.');
    return { accessToken: await this.jwt.signAsync({ role: 'platform' }) };
  }

  barbershops() { return this.prisma.barbershop.findMany({ omit: { passwordHash: true }, include: { payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } }); }
}
