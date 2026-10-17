import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentStatus, Prisma, SlotKind } from '@prisma/client';
import { BarberService } from '../barber/barber.service';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BlockDto, CreateBookingDto, RescheduleDto } from './dto/booking.dto';

const OPEN_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
const asDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
// Colombia no tiene horario de verano: la hora de la cita siempre es UTC-5, sin importar dónde corra el servidor.
const startsAt = (date: Date, time: string) => new Date(`${dateKey(date)}T${time}:00-05:00`).getTime();
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const fromMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const occupiedSlots = (time: string, duration: number) => Array.from({ length: Math.ceil(duration / 30) }, (_, index) => fromMinutes(minutes(time) + index * 30));

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService, private readonly catalog: CatalogService, private readonly barbers: BarberService, private readonly users: UserService, private readonly events: EventEmitter2) {}

  private validStart(time: string, duration: number) { return OPEN_SLOTS.includes(time) && minutes(time) + duration <= 18 * 60 + 30 && !occupiedSlots(time, duration).some((slot) => slot >= '12:30' && slot < '14:00'); }

  async availability(date: string, duration: number, barberId: string) {
    if (!this.validStart('09:00', duration)) throw new BadRequestException('Duración inválida.');
    await this.barbers.byId(barberId);
    const busy = await this.prisma.scheduleSlot.findMany({ where: { barberId, date: asDate(date) }, select: { time: true } });
    const busyTimes = new Set(busy.map((slot) => slot.time));
    return OPEN_SLOTS.filter((time) => this.validStart(time, duration) && startsAt(asDate(date), time) > Date.now() && occupiedSlots(time, duration).every((slot) => !busyTimes.has(slot)));
  }

  // Valida que la hora sea laboral, futura y que sus slots estén libres; devuelve los slots a ocupar.
  private async freeSlots(tx: Prisma.TransactionClient, barberId: string, date: Date, time: string, duration: number) {
    if (!this.validStart(time, duration) || startsAt(date, time) <= Date.now()) throw new BadRequestException('El horario solicitado no es válido.');
    const slotTimes = occupiedSlots(time, duration);
    const busy = await tx.scheduleSlot.count({ where: { barberId, date, time: { in: slotTimes } } });
    if (busy) throw new ConflictException('Este horario ya no está disponible. Elige otro, por favor.');
    return slotTimes.map((slot) => ({ barberId, date, time: slot, kind: SlotKind.BOOKING }));
  }

  // Cita del cliente que todavía puede cancelarse o moverse (confirmada y a más de 2 h).
  private async changeable(id: string, phone: string) {
    const booking = await this.prisma.appointment.findUnique({ where: { id }, include: { customer: true } });
    if (!booking || booking.customer.phone !== phone.replace(/\D/g, '')) throw new NotFoundException('No encontramos esa cita.');
    if (booking.status !== AppointmentStatus.CONFIRMED) throw new BadRequestException('Esta cita ya no se puede modificar.');
    if (startsAt(booking.date, booking.time) - Date.now() < 2 * 60 * 60 * 1000) throw new BadRequestException('La cita solo puede cancelarse o reprogramarse con al menos 2 horas de anticipación.');
    return booking;
  }

  async create(input: CreateBookingDto) {
    const phone = input.phone.replace(/\D/g, '');
    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const [service, barber] = await Promise.all([tx.service.findFirst({ where: { id: input.serviceId, active: true } }), tx.barber.findFirst({ where: { id: input.barberId, active: true } })]);
        if (!service || !barber) throw new NotFoundException('El servicio o barbero ya no está disponible.');
        const date = asDate(input.date);
        const slots = await this.freeSlots(tx, barber.id, date, input.time, service.duration);
        const customer = await tx.customer.upsert({ where: { phone }, create: { phone, name: input.customerName.trim() }, update: { name: input.customerName.trim() } });
        return tx.appointment.create({ data: { customerId: customer.id, serviceId: service.id, barberId: barber.id, date, time: input.time, duration: service.duration, slots: { create: slots } }, include: { customer: true, service: true, barber: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      this.events.emit('booking.created', appointment);
      return appointment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Otra persona acaba de tomar este horario. Selecciona uno diferente.');
      throw error;
    }
  }

  history(phone: string) { return this.prisma.appointment.findMany({ where: { customer: { phone: phone.replace(/\D/g, '') } }, include: { service: true, barber: true, customer: true }, orderBy: [{ date: 'desc' }, { time: 'desc' }] }); }

  async cancel(id: string, phone: string) {
    await this.changeable(id, phone);
    const updated = await this.prisma.$transaction(async (tx) => { await tx.scheduleSlot.deleteMany({ where: { appointmentId: id } }); return tx.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED }, include: { customer: true, service: true, barber: true } }); });
    this.events.emit('booking.cancelled', updated);
    return updated;
  }

  async reschedule(id: string, input: RescheduleDto) {
    const booking = await this.changeable(id, input.phone);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // Se sueltan los slots actuales primero para permitir mover la cita a una hora que se cruza con la anterior.
        await tx.scheduleSlot.deleteMany({ where: { appointmentId: id } });
        const date = asDate(input.date);
        const slots = await this.freeSlots(tx, booking.barberId, date, input.time, booking.duration);
        return tx.appointment.update({ where: { id }, data: { date, time: input.time, slots: { create: slots } }, include: { customer: true, service: true, barber: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      this.events.emit('booking.rescheduled', updated);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Otra persona acaba de tomar este horario. Selecciona uno diferente.');
      throw error;
    }
  }

  // barberId opcional: sin él, el panel ve la agenda de toda la barbería.
  adminAppointments(date: string, barberId?: string) { return this.prisma.appointment.findMany({ where: { date: asDate(date), ...(barberId && { barberId }) }, include: { customer: true, service: true, barber: true }, orderBy: { time: 'asc' } }); }
  async updateStatus(id: string, status: AppointmentStatus) {
    // Al cancelar se liberan los slots para que el horario vuelva a estar disponible.
    const updated = await this.prisma.$transaction(async (tx) => { if (status === AppointmentStatus.CANCELLED) await tx.scheduleSlot.deleteMany({ where: { appointmentId: id } }); return tx.appointment.update({ where: { id }, data: { status }, include: { customer: true, service: true, barber: true } }); });
    if (status === AppointmentStatus.CANCELLED) this.events.emit('booking.cancelled', updated);
    return updated;
  }

  async block(input: BlockDto) {
    await this.barbers.byId(input.barberId);
    if (!this.validStart(input.time, input.duration)) throw new BadRequestException('El bloqueo está fuera del horario laboral.');
    const date = asDate(input.date), slots = occupiedSlots(input.time, input.duration);
    try { return await this.prisma.scheduleBlock.create({ data: { barberId: input.barberId, date, time: input.time, duration: input.duration, note: input.note, slots: { create: slots.map((time) => ({ barberId: input.barberId, date, time, kind: SlotKind.BLOCK })) } }, include: { barber: true } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('No puedes bloquear un horario ocupado.'); throw error; }
  }
  blocks(date: string, barberId?: string) { return this.prisma.scheduleBlock.findMany({ where: { date: asDate(date), ...(barberId && { barberId }) }, include: { barber: true }, orderBy: { time: 'asc' } }); }
  unblock(id: string) { return this.prisma.scheduleBlock.delete({ where: { id } }); }
}
