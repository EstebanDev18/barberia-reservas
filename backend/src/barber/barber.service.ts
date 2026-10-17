import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarberService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  list() { return this.prisma.barber.findMany({ where: { active: true } }); }
  async byId(id: string) { return this.prisma.barber.findFirstOrThrow({ where: { id, active: true } }); }
  async login(password: string) {
    if (password !== (process.env.ADMIN_PASSWORD || 'esteban2026')) throw new UnauthorizedException('Contraseña incorrecta.');
    return { accessToken: await this.jwt.signAsync({ role: 'admin' }) };
  }
}
