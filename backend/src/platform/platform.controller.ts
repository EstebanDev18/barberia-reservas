import { Body, CanActivate, Controller, ExecutionContext, Get, Headers, HttpCode, Injectable, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { AdminGuard, ShopId } from '../common/admin.guard';
import { CURRENCIES, Currency, PERIODS, PLANS, Period, PlanId } from './plans';
import { PlatformService } from './platform.service';

class RegisterDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) ownerName!: string;
  @IsEmail() email!: string;
  @Matches(/^\D*(\d\D*){7,}$/) phone!: string;
  @IsString() @MinLength(2) city!: string;
  @IsString() @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }) password!: string;
  @IsIn(Object.keys(PLANS)) plan!: PlanId;
  @IsIn(Object.keys(PERIODS)) period!: Period;
  @IsOptional() @IsIn(CURRENCIES) currency?: Currency;
}
class RenewDto { @IsIn(Object.keys(PLANS)) plan!: PlanId; @IsIn(Object.keys(PERIODS)) period!: Period; }
class SyncDto { @IsString() @MinLength(3) id!: string; }
class DemoDto { @IsIn(['APPROVED', 'DECLINED']) status!: 'APPROVED' | 'DECLINED'; }
class LoginDto { @IsString() @MinLength(1) password!: string; }

// Acceso del dueño de BarberOS (distinto al panel de cada barbería).
@Injectable()
class PlatformGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const token = context.switchToHttp().getRequest().headers.authorization?.replace(/^Bearer\s+/i, '');
    try { return (await this.jwt.verifyAsync(token)).role === 'platform'; } catch { throw new UnauthorizedException('Inicia sesión en BarberOS.'); }
  }
}

@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}
  @Get('plans') plans() { return this.platform.plans(); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('barbershops') register(@Body() body: RegisterDto) { return this.platform.register(body); }
  // Renovar o cambiar de plan: lo pide el dueño desde su panel (el token dice de qué barbería se trata).
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @UseGuards(AdminGuard) @Post('renewals') renew(@ShopId() shopId: string, @Body() body: RenewDto) { return this.platform.renew(shopId, body.plan, body.period); }
  @Get('payments/:reference') status(@Param('reference') reference: string) { return this.platform.status(reference); }
  @Post('payments/sync') @HttpCode(200) sync(@Body() body: SyncDto) { return this.platform.sync(body.id); }
  @SkipThrottle() @Post('payments/wompi/webhook') @HttpCode(200) webhook(@Body() body: any, @Headers('x-event-checksum') checksum?: string) { return this.platform.webhook(body, checksum); }
  @Post('payments/:reference/demo') @HttpCode(200) demo(@Param('reference') reference: string, @Body() body: DemoDto) { return this.platform.demoPay(reference, body.status); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('login') login(@Body() body: LoginDto) { return this.platform.login(body.password); }
  @UseGuards(PlatformGuard) @Get('barbershops') barbershops() { return this.platform.barbershops(); }
}
