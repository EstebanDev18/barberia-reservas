// Aplica las migraciones pendientes del esquema de barbería (prisma/tenant) a la base de cada barbería.
// Correr después de crear una migración nueva en prisma/tenant/migrations (y en cada despliegue).
try { process.loadEnvFile(); } catch { /* sin backend/.env: se usan las variables del entorno */ }
import { PrismaClient as PlatformClient } from '.prisma/platform';
import { migrateTenantDatabase } from '../src/tenancy/provision';

async function main() {
  const platform = new PlatformClient();
  try {
    const shops = await platform.barbershop.findMany({ where: { databaseName: { not: '' } }, select: { name: true, databaseName: true } });
    let failed = 0;
    for (const shop of shops) {
      try { await migrateTenantDatabase(shop.databaseName); console.log(`OK    ${shop.databaseName} (${shop.name})`); }
      catch (error) { failed++; console.error(`FALLÓ ${shop.databaseName} (${shop.name}): ${error}`); }
    }
    console.log(`${shops.length - failed} de ${shops.length} base(s) al día.`);
    if (failed) process.exit(1);
  } finally { await platform.$disconnect(); }
}

main();
