import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '.prisma/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, PlanId } from '../platform/plans';
import { TenantService } from '../tenancy/tenant.service';

type BarberData = { name?: string; role?: string; bio?: string; active?: boolean };

@Injectable()
export class BarberService {
  constructor(private readonly platform: PrismaService, private readonly tenants: TenantService) {}
  async list(shopId: string) { return (await this.tenants.client(shopId)).barber.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }); }
  async byId(shopId: string, id: string) {
    // Sin id, findFirst devolvería cualquier barbero: se exige explícito.
    const barber = id ? await (await this.tenants.client(shopId)).barber.findFirst({ where: { id, active: true } }) : null;
    if (!barber) throw new NotFoundException('Barbero no disponible.');
    return barber;
  }
  async create(shopId: string, data: { name: string; role: string; bio: string }) {
    // El plan (en la base de la plataforma) pone el tope de barberos activos (Full no tiene tope).
    const shop = await this.platform.barbershop.findUniqueOrThrow({ where: { id: shopId } });
    const plan = PLANS[shop.plan as PlanId];
    const db = await this.tenants.client(shopId);
    if (plan?.barbers && (await db.barber.count({ where: { active: true } })) >= plan.barbers) throw new ForbiddenException(`Tu plan ${plan.name} permite hasta ${plan.barbers} barbero${plan.barbers > 1 ? 's' : ''}. Mejora tu plan para sumar más.`);
    return db.barber.create({ data });
  }
  async update(shopId: string, id: string, data: BarberData) {
    const db = await this.tenants.client(shopId);
    if (!(await db.barber.findUnique({ where: { id } }))) throw new NotFoundException('Barbero no encontrado.');
    if (data.active === false) {
      // No se retira a un barbero con citas por atender: primero se cancelan o se reprograman.
      const today = new Date(`${new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}T00:00:00.000Z`);
      const pending = await db.appointment.count({ where: { barberId: id, status: AppointmentStatus.CONFIRMED, date: { gte: today } } });
      if (pending) throw new ConflictException(`Este barbero tiene ${pending} cita(s) pendiente(s). Cancélalas o reprográmalas antes de retirarlo.`);
    }
    return db.barber.update({ where: { id }, data });
  }
}
