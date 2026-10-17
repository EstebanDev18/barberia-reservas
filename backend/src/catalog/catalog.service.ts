import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ServiceData = { name: string; duration: number; price: number; description: string };

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  list(shopId: string) { return this.prisma.service.findMany({ where: { barbershopId: shopId, active: true }, orderBy: { price: 'asc' } }); }
  async update(shopId: string, id: string, data: Partial<ServiceData> & { active?: boolean }) {
    if (!(await this.prisma.service.findFirst({ where: { id, barbershopId: shopId } }))) throw new NotFoundException('Servicio no encontrado.');
    return this.prisma.service.update({ where: { id }, data });
  }
  // El nombre es único por barbería: si vuelven a agregar un servicio que habían quitado, se reactiva con los datos nuevos.
  create(shopId: string, data: ServiceData) { return this.prisma.service.upsert({ where: { barbershopId_name: { barbershopId: shopId, name: data.name } }, create: { ...data, barbershopId: shopId }, update: { ...data, active: true } }); }
}
