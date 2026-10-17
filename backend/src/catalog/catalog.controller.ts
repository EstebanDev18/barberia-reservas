import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AdminGuard, ShopId } from '../common/admin.guard';
import { ShopService } from '../shop/shop.service';
import { CatalogService } from './catalog.service';

class ServiceDto { @IsString() name!: string; @IsInt() @Min(10) duration!: number; @IsInt() @Min(0) price!: number; @IsString() description!: string; }
class ServicePatchDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsInt() @Min(10) duration?: number; @IsOptional() @IsInt() @Min(0) price?: number; @IsOptional() @IsString() description?: string; @IsOptional() @IsBoolean() active?: boolean; }

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService, private readonly shops: ShopService) {}
  @Get('shops/:slug/services') async list(@Param('slug') slug: string) { return this.catalog.list(await this.shops.id(slug)); }
  @UseGuards(AdminGuard) @Get('admin/services') adminList(@ShopId() shopId: string) { return this.catalog.list(shopId); }
  @UseGuards(AdminGuard) @Post('admin/services') create(@ShopId() shopId: string, @Body() body: ServiceDto) { return this.catalog.create(shopId, body); }
  @UseGuards(AdminGuard) @Patch('admin/services/:id') update(@ShopId() shopId: string, @Param('id') id: string, @Body() body: ServicePatchDto) { return this.catalog.update(shopId, id, body); }
}
