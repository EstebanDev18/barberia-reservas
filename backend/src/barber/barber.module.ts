import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminGuard } from '../common/admin.guard';
import { ShopModule } from '../shop/shop.module';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';

@Module({ imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'dev-secret-change-me', signOptions: { expiresIn: '8h' } }), ShopModule], controllers: [BarberController], providers: [BarberService, AdminGuard], exports: [BarberService, AdminGuard] })
export class BarberModule {}
