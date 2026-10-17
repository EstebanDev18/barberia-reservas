import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AdminGuard } from '../common/admin.guard';
import { CatalogService } from './catalog.service';

class ServiceDto { @IsString() name!: string; @IsInt() @Min(10) duration!: number; @IsInt() @Min(0) price!: number; @IsString() description!: string; }
class ServicePatchDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsInt() @Min(10) duration?: number; @IsOptional() @IsInt() @Min(0) price?: number; @IsOptional() @IsString() description?: string; @IsOptional() @IsBoolean() active?: boolean; }

@Controller('services')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get() list() { return this.catalog.list(); }
  @UseGuards(AdminGuard) @Post() create(@Body() body: ServiceDto) { return this.catalog.create(body); }
  @UseGuards(AdminGuard) @Patch(':id') update(@Param('id') id: string, @Body() body: ServicePatchDto) { return this.catalog.update(id, body); }
}
