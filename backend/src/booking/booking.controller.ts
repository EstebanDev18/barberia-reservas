import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentStatus } from '.prisma/tenant';
import { AdminGuard, ShopId } from '../common/admin.guard';
import { ShopService } from '../shop/shop.service';
import { BlockDto, CancelBookingDto, CreateBookingDto, RescheduleDto, StatusDto } from './dto/booking.dto';
import { BookingService } from './booking.service';

// Reservar o mover exige licencia vigente; consultar y cancelar no, para no dejar al cliente atrapado.
@Controller()
export class BookingController {
  constructor(private readonly bookings: BookingService, private readonly shops: ShopService) {}
  @Get('shops/:slug/availability') async availability(@Param('slug') slug: string, @Query('date') date: string, @Query('duration') duration: string, @Query('barberId') barberId: string) { return this.bookings.availability(await this.shops.openId(slug), date, Number(duration), barberId); }
  @Post('shops/:slug/bookings') async create(@Param('slug') slug: string, @Body() input: CreateBookingDto) { return this.bookings.create(await this.shops.openId(slug), input); }
  @Get('shops/:slug/bookings') async history(@Param('slug') slug: string, @Query('phone') phone: string) { return this.bookings.history(await this.shops.id(slug), phone); }
  @Patch('shops/:slug/bookings/:id/cancel') async cancel(@Param('slug') slug: string, @Param('id') id: string, @Body() body: CancelBookingDto) { return this.bookings.cancel(await this.shops.id(slug), id, body.phone); }
  @Patch('shops/:slug/bookings/:id/reschedule') async reschedule(@Param('slug') slug: string, @Param('id') id: string, @Body() body: RescheduleDto) { return this.bookings.reschedule(await this.shops.openId(slug), id, body); }
  @UseGuards(AdminGuard) @Get('admin/bookings') list(@ShopId() shopId: string, @Query('date') date: string, @Query('barberId') barberId?: string) { return this.bookings.adminAppointments(shopId, date, barberId); }
  @UseGuards(AdminGuard) @Patch('admin/bookings/:id') status(@ShopId() shopId: string, @Param('id') id: string, @Body() body: StatusDto) { return this.bookings.updateStatus(shopId, id, body.status as AppointmentStatus); }
  @UseGuards(AdminGuard) @Get('admin/blocks') blocks(@ShopId() shopId: string, @Query('date') date: string, @Query('barberId') barberId?: string) { return this.bookings.blocks(shopId, date, barberId); }
  @UseGuards(AdminGuard) @Post('admin/blocks') block(@ShopId() shopId: string, @Body() body: BlockDto) { return this.bookings.block(shopId, body); }
  @UseGuards(AdminGuard) @Delete('admin/blocks/:id') unblock(@ShopId() shopId: string, @Param('id') id: string) { return this.bookings.unblock(shopId, id); }
}
