import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

type B = Record<string, unknown>;

// Semua alamat di bawah /admin hanya untuk akun admin.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview') overview() { return this.admin.overview(); }

  // ---- pengguna
  @Get('users') users(@Query('q') q?: string, @Query('page') page?: string) { return this.admin.users(q, page); }
  @Delete('users/:id') deleteUser(@Param('id') id: string, @Req() req: { user: { sub: string } }) { return this.admin.deleteUser(id, req.user.sub); }

  // ---- kamus
  @Get('dictionary') dictList(@Query('q') q?: string, @Query('status') status?: string, @Query('page') page?: string) { return this.admin.dictionaryList(q, status, page); }
  @Post('dictionary') dictCreate(@Body() b: B) { return this.admin.dictionaryCreate(b); }
  @Get('dictionary/:id') dictGet(@Param('id') id: string) { return this.admin.dictionaryGet(id); }
  @Patch('dictionary/:id') dictUpdate(@Param('id') id: string, @Body() b: B) { return this.admin.dictionaryUpdate(id, b); }
  @Patch('dictionary/:id/status') dictStatus(@Param('id') id: string, @Body() b: B) { return this.admin.dictionaryStatus(id, b); }
  @Delete('dictionary/:id') dictDelete(@Param('id') id: string) { return this.admin.dictionaryDelete(id); }

  // ---- kategori & kalimat
  @Get('categories') categories() { return this.admin.categories(); }
  @Get('sentences') sentList(@Query('q') q?: string, @Query('categoryId') c?: string, @Query('status') s?: string, @Query('page') p?: string) { return this.admin.sentenceList(q, c, s, p); }
  @Post('sentences') sentCreate(@Body() b: B) { return this.admin.sentenceCreate(b); }
  @Patch('sentences/:id') sentUpdate(@Param('id') id: string, @Body() b: B) { return this.admin.sentenceUpdate(id, b); }
  @Patch('sentences/:id/status') sentStatus(@Param('id') id: string, @Body() b: B) { return this.admin.sentenceStatus(id, b); }
  @Delete('sentences/:id') sentDelete(@Param('id') id: string) { return this.admin.sentenceDelete(id); }

  // ---- grammar
  @Get('grammar/topics') topics() { return this.admin.grammarTopics(); }
  @Post('grammar/topics') topicCreate(@Body() b: B) { return this.admin.grammarTopicCreate(b); }
  @Patch('grammar/topics/:id') topicUpdate(@Param('id') id: string, @Body() b: B) { return this.admin.grammarTopicUpdate(id, b); }
  @Patch('grammar/topics/:id/status') topicStatus(@Param('id') id: string, @Body() b: B) { return this.admin.grammarTopicStatus(id, b); }
  @Delete('grammar/topics/:id') topicDelete(@Param('id') id: string) { return this.admin.grammarTopicDelete(id); }

  @Get('grammar/topics/:id/lessons') lessons(@Param('id') id: string) { return this.admin.grammarLessons(id); }
  @Post('grammar/topics/:id/lessons') lessonCreate(@Param('id') id: string, @Body() b: B) { return this.admin.grammarLessonCreate(id, b); }
  @Patch('grammar/lessons/:id') lessonUpdate(@Param('id') id: string, @Body() b: B) { return this.admin.grammarLessonUpdate(id, b); }
  @Delete('grammar/lessons/:id') lessonDelete(@Param('id') id: string) { return this.admin.grammarLessonDelete(id); }

  @Get('grammar/questions') qList(@Query('topicId') t?: string, @Query('status') s?: string, @Query('page') p?: string) { return this.admin.grammarQuestionList(t, s, p); }
  @Post('grammar/questions') qCreate(@Body() b: B) { return this.admin.grammarQuestionCreate(b); }
  @Patch('grammar/questions/:id') qUpdate(@Param('id') id: string, @Body() b: B) { return this.admin.grammarQuestionUpdate(id, b); }
  @Patch('grammar/questions/:id/status') qStatus(@Param('id') id: string, @Body() b: B) { return this.admin.grammarQuestionStatus(id, b); }
  @Delete('grammar/questions/:id') qDelete(@Param('id') id: string) { return this.admin.grammarQuestionDelete(id); }
}
