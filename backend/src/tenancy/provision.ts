// Crear y migrar la base propia de cada barbería. Código sin Nest para poder usarlo también desde scripts (seed, split, migrate).
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { PrismaClient as PlatformClient } from '.prisma/platform';

const run = promisify(execFile);

// Solo minúsculas, números y guion bajo: el nombre va dentro de CREATE DATABASE, que no admite parámetros.
export const databaseNameFor = (shopId: string) => `barberos_shop_${shopId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 63);
const SAFE_NAME = /^barberos_shop_[a-z0-9_]{1,49}$/;

export function tenantUrl(databaseName: string) {
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE;
  if (!template?.includes('{db}')) throw new Error('Falta TENANT_DATABASE_URL_TEMPLATE (debe contener {db}).');
  return template.replace('{db}', databaseName);
}

// Busca prisma/tenant/schema.prisma subiendo desde este archivo: funciona igual con ts-node (src/) y compilado (dist/).
function tenantSchemaPath() {
  if (process.env.TENANT_SCHEMA_PATH) return process.env.TENANT_SCHEMA_PATH;
  for (let dir = __dirname, i = 0; i < 6; i++, dir = dirname(dir)) {
    const candidate = join(dir, 'prisma', 'tenant', 'schema.prisma');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('No se encontró prisma/tenant/schema.prisma.');
}

// Aplica las migraciones pendientes del esquema de barbería a una base (prisma migrate deploy es idempotente).
export async function migrateTenantDatabase(databaseName: string) {
  const cli = require.resolve('prisma/build/index.js');
  await run(process.execPath, [cli, 'migrate', 'deploy', '--schema', tenantSchemaPath()], { env: { ...process.env, TENANT_DATABASE_URL: tenantUrl(databaseName) } });
}

// Crea la base (si no existe), la migra y la anota en la plataforma. Seguro de repetir.
export async function provisionTenantDatabase(platform: PlatformClient, shopId: string) {
  const shop = await platform.barbershop.findUniqueOrThrow({ where: { id: shopId }, select: { databaseName: true } });
  const databaseName = shop.databaseName || databaseNameFor(shopId);
  if (!SAFE_NAME.test(databaseName)) throw new Error(`Nombre de base inválido: ${databaseName}`);
  const exists = await platform.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
  if (!exists.length) {
    try { await platform.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`); }
    catch (error: any) { if (!String(error?.message).includes('already exists')) throw error; } // otra petición la creó al mismo tiempo
  }
  await migrateTenantDatabase(databaseName);
  if (shop.databaseName !== databaseName) await platform.barbershop.update({ where: { id: shopId }, data: { databaseName } });
  return databaseName;
}
