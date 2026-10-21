import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SubmitGrammarDto } from './grammar.dto';
import { GrammarService } from './grammar.service';

interface AuthedRequest {
  user?: { sub?: string; userId?: string; id?: string };
}

function userIdOf(req: AuthedRequest): string {
  const id = req.user?.sub ?? req.user?.userId ?? req.user?.id;
  if (!id) throw new UnauthorizedException();
  return id;
}

@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}

  @Get('topics')
  topics(@Query('level') level?: string) {
    return this.grammar.listTopics(level);
  }

  // Skor terbaik pengguna di tiap topik.
  @UseGuards(AuthGuard)
  @Get('progress')
  progress(@Req() req: AuthedRequest) {
    return this.grammar.progress(userIdOf(req));
  }

  @Get('topics/:id')
  topic(@Param('id') id: string) {
    return this.grammar.getTopic(id);
  }

  @UseGuards(AuthGuard)
  @Post('topics/:id/attempts')
  submit(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: SubmitGrammarDto,
  ) {
    return this.grammar.submitAttempt(userIdOf(req), id, dto);
  }
}
