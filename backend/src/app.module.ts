import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { BarberModule } from './barber/barber.module';
import { UserModule } from './user/user.module';
import { BookingModule } from './booking/booking.module';
import { NotificationModule } from './notification/notification.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), EventEmitterModule.forRoot(), PrismaModule, CatalogModule, BarberModule, UserModule, BookingModule, NotificationModule] })
export class AppModule {}
