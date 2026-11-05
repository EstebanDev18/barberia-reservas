import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BarbershopStatus } from '.prisma/platform';
import { checkPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC = { id: true, name: true, slug: true, theme: true, accent: true, heroImage: true, address: true, mapsUrl: true, whatsapp: true, instagram: true } as const;
const SETTINGS = { ...PUBLIC, plan: true, status: true, paidUntil: true } as const;
export type ShopSettings = { theme?: string; accent?: string; address?: string; mapsUrl?: string; whatsapp?: string; instagram?: string };

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private isOpen(shop: { status: BarbershopStatus; paidUntil: Date | null }) { return shop.status === BarbershopStatus.ACTIVE && !!shop.paidUntil && shop.paidUntil > new Date(); }

  // Una barbería que nunca pagó no existe para el público; una vencida se ve, pero sin reservas.
  async bySlug(slug: string) {
    const shop = await this.prisma.barbershop.findUnique({ where: { slug }, select: SETTINGS });
    if (!shop || shop.status !== BarbershopStatus.ACTIVE) throw new NotFoundException('Barbería no encontrada.');
    const { plan, status, paidUntil, ...rest } = shop;
    return { ...rest, open: this.isOpen(shop) };
  }
  async id(slug: string) { return (await this.bySlug(slug)).id; }
  // Para reservar o mover citas la licencia tiene que estar vigente.
  async openId(slug: string) {
    const shop = await this.bySlug(slug);
    if (!shop.open) throw new ForbiddenException('Esta barbería tiene las reservas en línea pausadas por ahora.');
    return shop.id;
  }

  async login(slug: string, password: string) {
    const shop = await this.prisma.barbershop.findUnique({ where: { slug } });
    if (!shop || shop.status !== BarbershopStatus.ACTIVE || !checkPassword(password, shop.passwordHash)) throw new UnauthorizedException('Contraseña incorrecta.');
    return { accessToken: await this.jwt.signAsync({ role: 'admin', shopId: shop.id }) };
  }

  async settings(shopId: string) { const shop = await this.prisma.barbershop.findUniqueOrThrow({ where: { id: shopId }, select: SETTINGS }); return { ...shop, open: this.isOpen(shop) }; }
  async update(shopId: string, data: ShopSettings) { await this.prisma.barbershop.update({ where: { id: shopId }, data }); return this.settings(shopId); }
}
