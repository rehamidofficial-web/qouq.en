import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Cek ringan: hanya memastikan server hidup. Dipakai oleh layanan hosting.
  @Get()
  alive() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  // Cek lengkap: sekaligus mencoba menyentuh database.
  @Get('db')
  async database() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok', time: new Date().toISOString() };
    } catch {
      return { status: 'degraded', database: 'error', time: new Date().toISOString() };
    }
  }
}
