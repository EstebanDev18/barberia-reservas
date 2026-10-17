import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.service.findMany({ where: { active: true }, orderBy: { price: 'asc' } }); }
  async byId(id: string) { const service = await this.prisma.service.findFirst({ where: { id, active: true } }); if (!service) throw new NotFoundException('Servicio no disponible.'); return service; }
  update(id: string, data: { name?: string; duration?: number; price?: number; description?: string; active?: boolean }) { return this.prisma.service.update({ where: { id }, data }); }
  // El nombre es único: si el barbero vuelve a agregar un servicio que había quitado, se reactiva con los datos nuevos.
  create(data: { name: string; duration: number; price: number; description: string }) { return this.prisma.service.upsert({ where: { name: data.name }, create: data, update: { ...data, active: true } }); }
}
