import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../tenancy/tenant.service';

type ServiceData = { name: string; duration: number; price: number; description: string };

// Cada barbería tiene su propia base: no hace falta filtrar por barbería.
@Injectable()
export class CatalogService {
  constructor(private readonly tenants: TenantService) {}
  async list(shopId: string) { return (await this.tenants.client(shopId)).service.findMany({ where: { active: true }, orderBy: { price: 'asc' } }); }
  async update(shopId: string, id: string, data: Partial<ServiceData> & { active?: boolean }) {
    const db = await this.tenants.client(shopId);
    if (!(await db.service.findUnique({ where: { id } }))) throw new NotFoundException('Servicio no encontrado.');
    return db.service.update({ where: { id }, data });
  }
  // El nombre es único en la barbería: si vuelven a agregar un servicio que habían quitado, se reactiva con los datos nuevos.
  async create(shopId: string, data: ServiceData) { return (await this.tenants.client(shopId)).service.upsert({ where: { name: data.name }, create: data, update: { ...data, active: true } }); }
}
