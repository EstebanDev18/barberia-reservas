import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminGuard } from '../common/admin.guard';
import { ShopModule } from '../shop/shop.module';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';

// Sin JWT_SECRET la API no arranca: un secreto por defecto dejaría a cualquiera fabricar sesiones de administrador.
export function jwtOptions() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET en backend/.env.');
  if (process.env.NODE_ENV === 'production' && secret === 'cambia-este-secreto') throw new Error('JWT_SECRET todavía tiene el valor de ejemplo: cámbialo antes de publicar.');
  return { secret, signOptions: { expiresIn: '8h' as const } };
}

@Module({ imports: [JwtModule.registerAsync({ global: true, useFactory: jwtOptions }), ShopModule], controllers: [BarberController], providers: [BarberService, AdminGuard], exports: [BarberService, AdminGuard] })
export class BarberModule {}
