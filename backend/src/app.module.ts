import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { BarberModule } from './barber/barber.module';
import { ShopModule } from './shop/shop.module';
import { BookingModule } from './booking/booking.module';
import { NotificationModule } from './notification/notification.module';
import { PlatformModule } from './platform/platform.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), EventEmitterModule.forRoot(), PrismaModule, TenancyModule, CatalogModule, BarberModule, ShopModule, BookingModule, NotificationModule, PlatformModule] })
export class AppModule {}
