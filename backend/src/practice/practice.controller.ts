import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AttemptDto, CompareDto, StartSessionDto } from './practice.dto';
import { PracticeService } from './practice.service';
import { scoreSpeech } from './scoring';

interface AuthedRequest {
  user?: { sub?: string; userId?: string; id?: string };
}

function userIdOf(req: AuthedRequest): string {
  const id = req.user?.sub ?? req.user?.userId ?? req.user?.id;
  if (!id) throw new UnauthorizedException();
  return id;
}

@Controller('practice')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  // Pembanding murni (tanpa database). Dipakai untuk uji coba rumus.
  @Post('compare')
  compare(@Body() dto: CompareDto) {
    return scoreSpeech(dto.targetText, dto.spokenText, dto.confidence);
  }

  @UseGuards(AuthGuard)
  @Post('sessions')
  start(@Req() req: AuthedRequest, @Body() dto: StartSessionDto) {
    return this.practice.startSession(userIdOf(req), dto);
  }

  @UseGuards(AuthGuard)
  @Post('sessions/:id/attempts')
  attempt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: AttemptDto,
  ) {
    return this.practice.addAttempt(userIdOf(req), id, dto);
  }

  @UseGuards(AuthGuard)
  @Post('sessions/:id/finish')
  finish(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.practice.finishSession(userIdOf(req), id);
  }

  // Ringkasan Beranda/Statistik: streak, skor rata-rata, tren, kata lemah.
  @UseGuards(AuthGuard)
  @Get('stats')
  stats(
    @Req() req: AuthedRequest,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.practice.stats(userIdOf(req), days);
  }

  // Kemajuan per kategori: berapa kalimat yang sudah dilatih.
  @UseGuards(AuthGuard)
  @Get('progress')
  progress(@Req() req: AuthedRequest) {
    return this.practice.progressByCategory(userIdOf(req));
  }

  // Daftar kalimat satu kategori + skor terbaik pengguna (status: all, todo, done).
  @UseGuards(AuthGuard)
  @Get('progress/:idOrSlug')
  progressList(
    @Req() req: AuthedRequest,
    @Param('idOrSlug') idOrSlug: string,
    @Query('status') status: string | undefined,
    @Query('level') level: string | undefined,
    @Query('q') q: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.practice.sentencesWithProgress(userIdOf(req), idOrSlug, {
      status,
      level,
      q,
      page,
      limit,
    });
  }

  @UseGuards(AuthGuard)
  @Get('sessions/:id')
  detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.practice.getSession(userIdOf(req), id);
  }
}
