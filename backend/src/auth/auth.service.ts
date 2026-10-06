import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async buildAuthResponse(
    user: { id: string; email: string; name: string },
    roles: string[],
  ) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      roles,
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, roles },
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const learnerRole = await this.prisma.role.findUnique({
      where: { name: 'LEARNER' },
    });
    if (!learnerRole) {
      throw new InternalServerErrorException('Role LEARNER belum ada di database');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        profile: { create: {} },
        roles: { create: { role: { connect: { id: learnerRole.id } } } },
      },
    });

    return this.buildAuthResponse(user, ['LEARNER']);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new UnauthorizedException('Email atau password salah');
    }
    return this.buildAuthResponse(
      user,
      user.roles.map((r) => r.role.name),
    );
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Token reset untuk ${user.email}: ${token}`);
      }
    }
    return { message: 'Jika email terdaftar, instruksi reset password sudah dibuat.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token tidak valid atau sudah kedaluwarsa');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: 'Password berhasil diubah. Silakan login.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        profile: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return { ...user, roles: user.roles.map((r) => r.role.name) };
  }
}
