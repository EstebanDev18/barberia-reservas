// Renovación de licencia desde el panel. Dobles en memoria: no necesita base de datos.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformService } from '../src/platform/platform.service';

function setup(shop: Record<string, unknown> | null, activeBarbers = 1, lastCurrency?: string) {
  const created: any[] = [];
  const prisma: any = {
    barbershop: { findUnique: async () => shop },
    payment: {
      findFirst: async () => (lastCurrency ? { currency: lastCurrency } : null),
      create: async ({ data }: any) => { created.push(data); return data; },
    },
  };
  const tenants: any = { client: async () => ({ barber: { count: async () => activeBarbers } }) };
  return { platform: new PlatformService(prisma, {} as any, tenants), created };
}
const active = { id: 's1', name: 'QA', slug: 'qa', email: 'qa@ejemplo.com', ownerName: 'QA', status: 'ACTIVE', plan: 'pro', currency: 'COP' };

test('renovar crea un pago de renovación sobre la misma barbería, con el precio del servidor', async () => {
  const { platform, created } = setup(active, 3);
  const result = await platform.renew('s1', 'pro', 'YEARLY');
  assert.equal(created.length, 1);
  assert.equal(created[0].barbershopId, 's1');
  assert.equal(created[0].amountInCents, 119900 * 10 * 100); // anual = 10 meses
  assert.match(result.reference, /^BOS-R-/);
  assert.match(result.checkoutUrl, /pago-demo\?reference=BOS-R-/); // sin llaves de Wompi se usa la pasarela simulada
});

test('la renovación se cobra en la moneda del último pago aprobado, no en la de la carta', async () => {
  const { platform, created } = setup({ ...active, currency: 'COP' }, 1, 'USD');
  const saved = process.env.NODE_ENV; // Stripe aún no existe: USD solo pasa por la pasarela simulada, fuera de producción
  try { process.env.NODE_ENV = 'test'; await platform.renew('s1', 'basico', 'MONTHLY'); } finally { process.env.NODE_ENV = saved; }
  assert.equal(created[0].currency, 'USD');
  assert.equal(created[0].amountInCents, 15 * 100);
});

test('no deja bajar a un plan con menos barberos de los que hay activos', async () => {
  const { platform, created } = setup(active, 3);
  await assert.rejects(platform.renew('s1', 'basico', 'MONTHLY'), BadRequestException);
  assert.equal(created.length, 0);
});

test('una barbería que nunca pagó no puede renovar', async () => {
  await assert.rejects(setup({ ...active, status: 'PENDING_PAYMENT' }).platform.renew('s1', 'pro', 'MONTHLY'), NotFoundException);
  await assert.rejects(setup(null).platform.renew('nadie', 'pro', 'MONTHLY'), NotFoundException);
});
