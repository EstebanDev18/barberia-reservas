import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantClient } from '.prisma/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { provisionTenantDatabase, tenantUrl } from './provision';

export type { TenantClient };

// Entrega el cliente de la base propia de cada barbería. Si la base aún no existe (p. ej. falló al aprobarse el pago), la crea.
@Injectable()
export class TenantService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);
  private readonly clients = new Map<string, Promise<TenantClient>>();
  constructor(private readonly platform: PrismaService) {}

  client(shopId: string): Promise<TenantClient> {
    let client = this.clients.get(shopId);
    if (!client) {
      client = this.open(shopId);
      this.clients.set(shopId, client);
      client.catch(() => this.clients.delete(shopId)); // un fallo no queda en caché: el siguiente intento reintenta
    }
    return client;
  }

  // Se llama al aprobarse el pago; si falla, client() lo reintenta en el primer uso.
  async provision(shopId: string) {
    try { await this.client(shopId); }
    catch (error) { this.logger.error(`No se pudo crear la base de la barbería ${shopId}: ${error}`); }
  }

  private async open(shopId: string) {
    const shop = await this.platform.barbershop.findUniqueOrThrow({ where: { id: shopId }, select: { databaseName: true } });
    const databaseName = shop.databaseName || (await provisionTenantDatabase(this.platform, shopId));
    if (!shop.databaseName) this.logger.log(`Base creada para la barbería ${shopId}: ${databaseName}`);
    return new TenantClient({ datasourceUrl: tenantUrl(databaseName) });
  }

  async onModuleDestroy() { await Promise.all([...this.clients.values()].map((client) => client.then((c) => c.$disconnect()).catch(() => undefined))); }
}
