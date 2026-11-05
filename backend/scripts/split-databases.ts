// Pasa los datos de la base única anterior (OLD_DATABASE_URL, por defecto la base "barberia") a la nueva estructura:
//   base de la plataforma (barberías y pagos) + una base por barbería (barberos, servicios, clientes, citas, bloqueos).
// No modifica la base anterior (queda como respaldo) y se puede correr varias veces: lo que ya está copiado se salta.
try { process.loadEnvFile(); } catch { /* sin backend/.env: se usan las variables del entorno */ }
import { PrismaClient as PlatformClient } from '.prisma/platform';
import { PrismaClient as TenantClient } from '.prisma/tenant';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { provisionTenantDatabase, tenantUrl } from '../src/tenancy/provision';

const OLD_URL = process.env.OLD_DATABASE_URL || 'postgresql://barberia:barberia@localhost:5432/barberia?schema=public';
type Row = Record<string, any>;
const without = (row: Row, ...keys: string[]) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));

async function main() {
  // 1. La base de la plataforma con sus migraciones al día.
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', join(__dirname, '..', 'prisma', 'platform', 'schema.prisma')], { stdio: 'inherit' });
  const old = new PlatformClient({ datasourceUrl: OLD_URL }); // solo para consultas SQL crudas sobre las tablas viejas
  const platform = new PlatformClient();
  try {
    const shops = await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Barbershop"');
    const payments = await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Payment"');
    const shopsDone = await platform.barbershop.createMany({ data: shops.map((shop) => ({ ...shop, databaseName: '' })) as any, skipDuplicates: true });
    const paymentsDone = await platform.payment.createMany({ data: payments as any, skipDuplicates: true });
    console.log(`Plataforma: ${shopsDone.count} barbería(s) y ${paymentsDone.count} pago(s) nuevos (de ${shops.length} y ${payments.length}).`);

    // 2. Cada barbería con licencia activa recibe su base y su operación. Las que nunca pagaron no tienen operación que copiar.
    for (const shop of shops.filter((s) => s.status === 'ACTIVE')) {
      const databaseName = await provisionTenantDatabase(platform, shop.id);
      const tenant = new TenantClient({ datasourceUrl: tenantUrl(databaseName) });
      try {
        const barbers = await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Barber" WHERE "barbershopId" = $1', shop.id);
        const services = await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Service" WHERE "barbershopId" = $1', shop.id);
        const ids = barbers.map((barber) => barber.id);
        const appointments = ids.length ? await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Appointment" WHERE "barberId" = ANY($1)', ids) : [];
        const customers = appointments.length ? await old.$queryRawUnsafe<Row[]>('SELECT * FROM "Customer" WHERE id = ANY($1)', [...new Set(appointments.map((a) => a.customerId))]) : [];
        const blocks = ids.length ? await old.$queryRawUnsafe<Row[]>('SELECT * FROM "ScheduleBlock" WHERE "barberId" = ANY($1)', ids) : [];
        const slots = ids.length ? await old.$queryRawUnsafe<Row[]>('SELECT * FROM "ScheduleSlot" WHERE "barberId" = ANY($1)', ids) : [];
        // El orden respeta las relaciones: primero lo que otros referencian.
        await tenant.barber.createMany({ data: barbers.map((b) => without(b, 'barbershopId')) as any, skipDuplicates: true });
        await tenant.service.createMany({ data: services.map((s) => without(s, 'barbershopId')) as any, skipDuplicates: true });
        await tenant.customer.createMany({ data: customers as any, skipDuplicates: true });
        await tenant.appointment.createMany({ data: appointments as any, skipDuplicates: true });
        await tenant.scheduleBlock.createMany({ data: blocks as any, skipDuplicates: true });
        await tenant.scheduleSlot.createMany({ data: slots as any, skipDuplicates: true });
        console.log(`${shop.name} → ${databaseName}: ${barbers.length} barbero(s), ${services.length} servicio(s), ${customers.length} cliente(s), ${appointments.length} cita(s), ${blocks.length} bloqueo(s).`);
      } finally { await tenant.$disconnect(); }
    }
  } finally { await Promise.all([old.$disconnect(), platform.$disconnect()]); }
}

main().catch((error) => { console.error(error); process.exit(1); });
