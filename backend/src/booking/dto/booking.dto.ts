import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class AvailabilityDto { @IsDateString() date!: string; @IsInt() @Min(10) duration!: number; @IsOptional() @IsString() barberId?: string; }
export class CreateBookingDto { @IsString() serviceId!: string; @IsString() barberId!: string; @IsDateString() date!: string; @Matches(/^\d{2}:\d{2}$/) time!: string; @IsString() @MinLength(2) customerName!: string; @Matches(/^\D*(\d\D*){7,}$/) phone!: string; }
export class CancelBookingDto { @Matches(/^\D*(\d\D*){7,}$/) phone!: string; }
export class StatusDto { @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED']) status!: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; }
export class BlockDto { @IsString() barberId!: string; @IsDateString() date!: string; @Matches(/^\d{2}:\d{2}$/) time!: string; @IsInt() @Min(30) duration!: number; @IsString() @MinLength(2) note!: string; }
