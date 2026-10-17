import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { BarberService } from './barber.service';

class LoginDto { @IsString() @MinLength(1) password!: string; }
@Controller()
export class BarberController {
  constructor(private readonly barber: BarberService) {}
  @Get('barbers') list() { return this.barber.list(); }
  @Post('admin/login') login(@Body() body: LoginDto) { return this.barber.login(body.password); }
}
