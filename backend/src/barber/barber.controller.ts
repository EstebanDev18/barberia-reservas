import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminGuard } from '../common/admin.guard';
import { BarberService } from './barber.service';

class LoginDto { @IsString() @MinLength(1) password!: string; }
class BarberDto { @IsString() @MinLength(2) name!: string; @IsString() role!: string; @IsString() bio!: string; }
class BarberPatchDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() bio?: string; @IsOptional() @IsBoolean() active?: boolean; }
@Controller()
export class BarberController {
  constructor(private readonly barber: BarberService) {}
  @Get('barbers') list() { return this.barber.list(); }
  @Post('admin/login') login(@Body() body: LoginDto) { return this.barber.login(body.password); }
  @UseGuards(AdminGuard) @Post('admin/barbers') create(@Body() body: BarberDto) { return this.barber.create(body); }
  @UseGuards(AdminGuard) @Patch('admin/barbers/:id') update(@Param('id') id: string, @Body() body: BarberPatchDto) { return this.barber.update(id, body); }
}
