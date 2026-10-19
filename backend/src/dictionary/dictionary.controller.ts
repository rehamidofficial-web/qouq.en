import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service';

@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionary: DictionaryService) {}

  @Get('autocomplete')
  autocomplete(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('pos') pos?: string,
    @Query('level') level?: string,
  ) {
    return this.dictionary.autocomplete(q, limit, pos, level);
  }

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('pos') pos?: string,
    @Query('level') level?: string,
  ) {
    return this.dictionary.search(q, page, limit, pos, level);
  }

  // Ejaan banyak kata sekaligus, mis. /dictionary/phonetics?words=tell,me,about
  @Get('phonetics')
  phonetics(@Query('words') words = '') {
    return this.dictionary.phonetics(words);
  }

  @Get('entries/:id')
  detail(@Param('id') id: string) {
    return this.dictionary.detail(id);
  }
}
