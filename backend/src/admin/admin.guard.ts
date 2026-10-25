import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

// Hanya akun dengan peran "admin" yang boleh lewat.
// Peran dicek ke database setiap kali, jadi kalau peran dicabut, akses langsung hilang
// (tidak menunggu token kedaluwarsa).
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { sub: string };
    }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token tidak ada');
    }
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kedaluwarsa');
    }
    const admin = await this.prisma.userRole.findFirst({
      where: { userId: payload.sub, role: { name: 'admin' } },
      select: { userId: true },
    });
    if (!admin) throw new ForbiddenException('Hanya admin yang boleh');
    req.user = payload;
    return true;
  }
}
