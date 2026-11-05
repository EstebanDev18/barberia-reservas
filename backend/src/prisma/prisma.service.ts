import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '.prisma/platform';

// Cliente de la base de la PLATAFORMA (barberías, licencias y pagos).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
  async enableShutdownHooks(app: INestApplication) { this.$on('beforeExit' as never, async () => app.close()); }
}
