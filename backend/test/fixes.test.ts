// Pruebas de las reglas que no deben volver a romperse. No necesitan base de datos: usan dobles en memoria.
// Correr: pnpm test (desde backend/).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { jwtOptions } from '../src/barber/barber.module';
import { BarberService } from '../src/barber/barber.service';
import { BookingService, asDate } from '../src/booking/booking.service';
import { PlatformService } from '../src/platform/platform.service';

const tenantsWith = (db: unknown) => ({ client: async () => db, provision: async () => undefined }) as any;

test('asDate acepta AAAA-MM-DD y rechaza lo demás con un 400', () => {
  assert.equal(asDate('2026-11-09').toISOString(), '2026-11-09T00:00:00.000Z');
  for (const bad of ['', 'hoy', '2026-13-01', '2026-02-30', '2026-11-09T10:00:00Z', undefined as unknown as string]) assert.throws(() => asDate(bad), BadRequestException, `debía rechazar ${bad}`);
});

test('una cita cancelada no se puede reconfirmar (su horario ya quedó libre)', async () => {
  let wrote = false;
  const db = { appointment: { findUnique: async () => ({ id: 'a1', status: 'CANCELLED' }) }, $transaction: async () => { wrote = true; } };
  const bookings = new BookingService(tenantsWith(db), {} as any, { emit: () => true } as any);
  await assert.rejects(bookings.updateStatus('shop', 'a1', 'CONFIRMED' as any), ConflictException);
  await assert.rejects(bookings.updateStatus('shop', 'a1', 'COMPLETED' as any), ConflictException);
  assert.equal(wrote, false);
});

test('reactivar un barbero retirado respeta el tope del plan', async () => {
  const updates: unknown[] = [];
  const db = (active: number) => ({ barber: { findUnique: async () => ({ id: 'b2', active: false }), count: async () => active, update: async (args: unknown) => { updates.push(args); return args; } } });
  const platform = { barbershop: { findUniqueOrThrow: async () => ({ plan: 'basico' }) } } as any; // Básico = 1 barbero
  await assert.rejects(new BarberService(platform, tenantsWith(db(1))).update('shop', 'b2', { active: true }), ForbiddenException);
  assert.equal(updates.length, 0);
  await new BarberService(platform, tenantsWith(db(0))).update('shop', 'b2', { active: true });
  assert.equal(updates.length, 1);
});

test('dos avisos simultáneos del mismo pago extienden la licencia una sola vez', async () => {
  const payment = { id: 'p1', reference: 'BOS-1', barbershopId: 's1', plan: 'pro', period: 'MONTHLY', amountInCents: 11990000, currency: 'COP', provider: 'wompi', status: 'PENDING' };
  const shop: { id: string; name: string; slug: string; status: string; paidUntil: Date | null } = { id: 's1', name: 'QA', slug: 'qa', status: 'PENDING_PAYMENT', paidUntil: null };
  let extensions = 0;
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const prisma: any = {
    payment: {
      findUnique: async () => { await tick(); return { ...payment, barbershop: { ...shop } }; },
      updateMany: async ({ where, data }: any) => { await tick(); if (payment.status !== where.status) return { count: 0 }; Object.assign(payment, data); return { count: 1 }; },
    },
    barbershop: {
      findUniqueOrThrow: async () => { await tick(); return { ...shop }; },
      update: async ({ data }: any) => { await tick(); extensions++; Object.assign(shop, data); return shop; },
    },
  };
  prisma.$transaction = async (run: (db: unknown) => Promise<unknown>) => run(prisma);
  const platform = new PlatformService(prisma, {} as any, tenantsWith({}));
  const tx = { id: 'w1', reference: 'BOS-1', status: 'APPROVED', amount_in_cents: 11990000, currency: 'COP' };
  const [first, second] = await Promise.all([platform.applyTransaction(tx), platform.applyTransaction(tx)]);
  assert.equal(extensions, 1);
  assert.equal(first.status, 'APPROVED');
  assert.equal(second.status, 'APPROVED');
  const months = (shop.paidUntil!.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000);
  assert.ok(months > 0.9 && months < 1.1, `la licencia debía quedar a ~1 mes y quedó a ${months.toFixed(2)}`);
});

test('la API no arranca sin JWT_SECRET', () => {
  const saved = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => jwtOptions(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'un-secreto-de-prueba';
    assert.equal(jwtOptions().secret, 'un-secreto-de-prueba');
  } finally { if (saved === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = saved; }
});

// Arranca la API completa (sin base de datos: la de la plataforma se reemplaza por un doble) y la golpea por HTTP.
test('el inicio de sesión se bloquea tras 10 intentos por minuto y no acepta sesiones firmadas con el secreto viejo', async () => {
  process.env.JWT_SECRET ||= 'un-secreto-de-prueba';
  const { Test } = await import('@nestjs/testing');
  const { JwtService } = await import('@nestjs/jwt');
  const { AppModule } = await import('../src/app.module');
  const { PrismaService } = await import('../src/prisma/prisma.service');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue({ barbershop: { findUnique: async () => null } }).compile();
  const app = moduleRef.createNestApplication();
  await app.listen(0);
  try {
    const url = await app.getUrl();
    const forged = await new JwtService({ secret: 'dev-secret-change-me' }).signAsync({ role: 'admin', shopId: 'legacy' });
    assert.equal((await fetch(`${url}/admin/shop`, { headers: { Authorization: `Bearer ${forged}` } })).status, 401);
    const login = () => fetch(`${url}/shops/no-existe/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'x' }) });
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await login()).status);
    assert.deepEqual(statuses, [...Array(10).fill(401), 429]);
  } finally { await app.close(); }
});
