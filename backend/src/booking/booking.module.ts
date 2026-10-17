import { Module } from '@nestjs/common';
import { BarberModule } from '../barber/barber.module';
import { ShopModule } from '../shop/shop.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({ imports: [BarberModule, ShopModule], controllers: [BookingController], providers: [BookingService], exports: [BookingService] })
export class BookingModule {}
