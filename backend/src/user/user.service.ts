import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  findOrCreate(name: string, phone: string) { return this.prisma.customer.upsert({ where: { phone }, create: { name, phone }, update: { name } }); }
}
