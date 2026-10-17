import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type BarberData = { name?: string; role?: string; bio?: string; active?: boolean };

@Injectable()
export class BarberService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  list() { return this.prisma.barber.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }); }
  async byId(id: string) {
    // Sin id, findFirst devolvería cualquier barbero: se exige explícito.
    const barber = id ? await this.prisma.barber.findFirst({ where: { id, active: true } }) : null;
    if (!barber) throw new NotFoundException('Barbero no disponible.');
    return barber;
  }
  create(data: { name: string; role: string; bio: string }) { return this.prisma.barber.create({ data }); }
  async update(id: string, data: BarberData) {
    if (data.active === false) {
      // No se retira a un barbero con citas por atender: primero se cancelan o se reprograman.
      const today = new Date(`${new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}T00:00:00.000Z`);
      const pending = await this.prisma.appointment.count({ where: { barberId: id, status: AppointmentStatus.CONFIRMED, date: { gte: today } } });
      if (pending) throw new ConflictException(`Este barbero tiene ${pending} cita(s) pendiente(s). Cancélalas o reprográmalas antes de retirarlo.`);
    }
    return this.prisma.barber.update({ where: { id }, data });
  }
  async login(password: string) {
    if (password !== (process.env.ADMIN_PASSWORD || 'esteban2026')) throw new UnauthorizedException('Contraseña incorrecta.');
    return { accessToken: await this.jwt.signAsync({ role: 'admin' }) };
  }
}
