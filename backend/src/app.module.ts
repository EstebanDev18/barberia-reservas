import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { BarberModule } from './barber/barber.module';
import { ShopModule } from './shop/shop.module';
import { BookingModule } from './booking/booking.module';
import { NotificationModule } from './notification/notification.module';
import { PlatformModule } from './platform/platform.module';
import { TenancyModule } from './tenancy/tenancy.module';

// Límite general por IP (300 peticiones por minuto); los inicios de sesión y el registro tienen uno más estricto con @Throttle.
@Module({ providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }], imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]), EventEmitterModule.forRoot(), PrismaModule, TenancyModule, CatalogModule, BarberModule, ShopModule, BookingModule, NotificationModule, PlatformModule] })
export class AppModule {}
