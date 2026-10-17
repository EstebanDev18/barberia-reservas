import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  @OnEvent('booking.created') confirmation(booking: { customer: { phone: string }; id: string }) { this.logger.log(`Confirmación pendiente para ${booking.customer.phone} (reserva ${booking.id}).`); }
  @OnEvent('booking.rescheduled') rescheduled(booking: { customer: { phone: string }; id: string; date: Date; time: string }) { this.logger.log(`Reprogramación pendiente para ${booking.customer.phone} (reserva ${booking.id}, nueva hora ${booking.time}).`); }
  @OnEvent('booking.cancelled') cancellation(booking: { customer: { phone: string }; id: string }) { this.logger.log(`Cancelación pendiente para ${booking.customer.phone} (reserva ${booking.id}).`); }
}
