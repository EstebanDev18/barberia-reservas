import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminGuard, ShopId } from '../common/admin.guard';
import { ShopService } from '../shop/shop.service';
import { BarberService } from './barber.service';

class BarberDto { @IsString() @MinLength(2) name!: string; @IsString() role!: string; @IsString() bio!: string; }
class BarberPatchDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() bio?: string; @IsOptional() @IsBoolean() active?: boolean; }
@Controller()
export class BarberController {
  constructor(private readonly barber: BarberService, private readonly shops: ShopService) {}
  @Get('shops/:slug/barbers') async list(@Param('slug') slug: string) { return this.barber.list(await this.shops.id(slug)); }
  @UseGuards(AdminGuard) @Get('admin/barbers') adminList(@ShopId() shopId: string) { return this.barber.list(shopId); }
  @UseGuards(AdminGuard) @Post('admin/barbers') create(@ShopId() shopId: string, @Body() body: BarberDto) { return this.barber.create(shopId, body); }
  @UseGuards(AdminGuard) @Patch('admin/barbers/:id') update(@ShopId() shopId: string, @Param('id') id: string, @Body() body: BarberPatchDto) { return this.barber.update(shopId, id, body); }
}
