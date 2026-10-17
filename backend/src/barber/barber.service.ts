import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, PlanId } from '../platform/plans';

type BarberData = { name?: string; role?: string; bio?: string; active?: boolean };

@Injectable()
export class BarberService {
  constructor(private readonly prisma: PrismaService) {}
  list(shopId: string) { return this.prisma.barber.findMany({ where: { barbershopId: shopId, active: true }, orderBy: { createdAt: 'asc' } }); }
  async byId(shopId: string, id: string) {
    // Sin id, findFirst devolvería cualquier barbero: se exige explícito.
    const barber = id ? await this.prisma.barber.findFirst({ where: { id, barbershopId: shopId, active: true } }) : null;
    if (!barber) throw new NotFoundException('Barbero no disponible.');
    return barber;
  }
  async create(shopId: string, data: { name: string; role: string; bio: string }) {
    // El plan pone el tope de barberos activos (Full no tiene tope).
    const shop = await this.prisma.barbershop.findUniqueOrThrow({ where: { id: shopId } });
    const plan = PLANS[shop.plan as PlanId];
    if (plan?.barbers && (await this.prisma.barber.count({ where: { barbershopId: shopId, active: true } })) >= plan.barbers) throw new ForbiddenException(`Tu plan ${plan.name} permite hasta ${plan.barbers} barbero${plan.barbers > 1 ? 's' : ''}. Mejora tu plan para sumar más.`);
    return this.prisma.barber.create({ data: { ...data, barbershopId: shopId } });
  }
  async update(shopId: string, id: string, data: BarberData) {
    if (!(await this.prisma.barber.findFirst({ where: { id, barbershopId: shopId } }))) throw new NotFoundException('Barbero no encontrado.');
    if (data.active === false) {
      // No se retira a un barbero con citas por atender: primero se cancelan o se reprograman.
      const today = new Date(`${new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}T00:00:00.000Z`);
      const pending = await this.prisma.appointment.count({ where: { barberId: id, status: AppointmentStatus.CONFIRMED, date: { gte: today } } });
      if (pending) throw new ConflictException(`Este barbero tiene ${pending} cita(s) pendiente(s). Cancélalas o reprográmalas antes de retirarlo.`);
    }
    return this.prisma.barber.update({ where: { id }, data });
  }
}
