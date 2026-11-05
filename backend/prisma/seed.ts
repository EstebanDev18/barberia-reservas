// Corre fuera de Nest: carga backend/.env por su cuenta (Node 24).
try { process.loadEnvFile(); } catch { /* sin backend/.env: se usan las variables del entorno */ }
import { PrismaClient as PlatformClient } from '.prisma/platform';
import { PrismaClient as TenantClient } from '.prisma/tenant';
import { hashPassword } from '../src/common/password';
import { provisionTenantDatabase, tenantUrl } from '../src/tenancy/provision';

const platform = new PlatformClient();

async function main() {
  // Legacy Barber es la primera barbería cliente de BarberOS. La clave inicial sale de ADMIN_PASSWORD
  // y solo se pone si la barbería aún no tiene una (volver a sembrar no le cambia la clave al dueño).
  const paidUntil = new Date(); paidUntil.setFullYear(paidUntil.getFullYear() + 1);
  const legacy = { name: 'Legacy Barber', slug: 'legacy-barber', ownerName: 'Legacy Barber', email: 'legacy@barberos.local', phone: '', city: '', plan: 'pro', status: 'ACTIVE' as const, paidUntil, heroImage: '/night-cuts.webp' };
  const shop = await platform.barbershop.upsert({ where: { id: 'legacy' }, update: { heroImage: legacy.heroImage }, create: { id: 'legacy', ...legacy } });
  if (!shop.passwordHash) await platform.barbershop.update({ where: { id: shop.id }, data: { passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'legacy-dev') } });

  // Su operación va en su propia base (barberos_shop_legacy).
  const tenant = new TenantClient({ datasourceUrl: tenantUrl(await provisionTenantDatabase(platform, shop.id)) });
  try {
    await tenant.barber.upsert({ where: { id: 'esteban' }, update: {}, create: { id: 'esteban', name: 'Esteban', role: 'Barbero principal', bio: 'Estilo, precisión y buena conversación.' } });
    for (const service of [
      { id: 'corte-barba', name: 'Corte y barba', duration: 45, price: 45000, description: 'Corte, perfilado y acabado completo.' },
      { id: 'solo-corte', name: 'Solo corte', duration: 30, price: 30000, description: 'Un corte preciso y personalizado.' },
      { id: 'barba', name: 'Barba', duration: 20, price: 20000, description: 'Perfilado y arreglo de barba.' },
      { id: 'corte-nino', name: 'Corte niño', duration: 30, price: 25000, description: 'Para los más pequeños de la casa.' },
    ]) await tenant.service.upsert({ where: { id: service.id }, update: {}, create: service });
  } finally { await tenant.$disconnect(); }
}

main().finally(() => platform.$disconnect());
