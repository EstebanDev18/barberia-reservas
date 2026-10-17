import { Module } from '@nestjs/common';
import { BarberModule } from '../barber/barber.module';
import { CatalogModule } from '../catalog/catalog.module';
import { UserModule } from '../user/user.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({ imports: [CatalogModule, BarberModule, UserModule], controllers: [BookingController], providers: [BookingService], exports: [BookingService] })
export class BookingModule {}
