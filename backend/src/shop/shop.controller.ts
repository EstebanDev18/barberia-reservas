import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AdminGuard, ShopId } from '../common/admin.guard';
import { CURRENCIES } from '../platform/plans';
import { ShopService } from './shop.service';

const THEMES = ['callejero', 'clasico', 'minimal'];
class LoginDto { @IsString() @MinLength(1) password!: string; }
// Los enlaces se validan aquí porque se pintan como href en la página pública.
class SettingsDto {
  @IsOptional() @IsIn(THEMES) theme?: string;
  @IsOptional() @Matches(/^(#[0-9a-fA-F]{6})?$/, { message: 'El color debe ser #rrggbb.' }) accent?: string;
  @IsOptional() @IsString() @MaxLength(120) address?: string;
  @IsOptional() @Matches(/^(https:\/\/\S+)?$/, { message: 'El link de Maps debe empezar por https://' }) @MaxLength(300) mapsUrl?: string;
  @IsOptional() @Matches(/^\d{0,15}$/, { message: 'El WhatsApp va solo con números, con indicativo (ej. 573001234567).' }) whatsapp?: string;
  @IsOptional() @Matches(/^[A-Za-z0-9._]{0,30}$/, { message: 'El Instagram va sin @ ni espacios.' }) instagram?: string;
  @IsOptional() @IsIn(CURRENCIES, { message: 'La moneda debe ser COP, USD o EUR.' }) currency?: string;
}

@Controller()
export class ShopController {
  constructor(private readonly shops: ShopService) {}
  @Get('shops/:slug') get(@Param('slug') slug: string) { return this.shops.bySlug(slug); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('shops/:slug/login') login(@Param('slug') slug: string, @Body() body: LoginDto) { return this.shops.login(slug, body.password); }
  @UseGuards(AdminGuard) @Get('admin/shop') settings(@ShopId() shopId: string) { return this.shops.settings(shopId); }
  @UseGuards(AdminGuard) @Patch('admin/shop') update(@ShopId() shopId: string, @Body() body: SettingsDto) { return this.shops.update(shopId, body); }
}
