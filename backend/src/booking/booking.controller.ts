import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AdminGuard } from '../common/admin.guard';
import { BlockDto, CancelBookingDto, CreateBookingDto, StatusDto } from './dto/booking.dto';
import { BookingService } from './booking.service';

@Controller()
export class BookingController {
  constructor(private readonly bookings: BookingService) {}
  @Get('availability') availability(@Query('date') date: string, @Query('duration') duration: string, @Query('barberId') barberId?: string) { return this.bookings.availability(date, Number(duration), barberId); }
  @Post('bookings') create(@Body() input: CreateBookingDto) { return this.bookings.create(input); }
  @Get('bookings') history(@Query('phone') phone: string) { return this.bookings.history(phone); }
  @Patch('bookings/:id/cancel') cancel(@Param('id') id: string, @Body() body: CancelBookingDto) { return this.bookings.cancel(id, body.phone); }
  @UseGuards(AdminGuard) @Get('admin/bookings') list(@Query('date') date: string) { return this.bookings.adminAppointments(date); }
  @UseGuards(AdminGuard) @Patch('admin/bookings/:id') status(@Param('id') id: string, @Body() body: StatusDto) { return this.bookings.updateStatus(id, body.status as AppointmentStatus); }
  @UseGuards(AdminGuard) @Post('admin/blocks') block(@Body() body: BlockDto) { return this.bookings.block(body); }
  @UseGuards(AdminGuard) @Delete('admin/blocks/:id') unblock(@Param('id') id: string) { return this.bookings.unblock(id); }
}
