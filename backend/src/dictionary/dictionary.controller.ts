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
  ) {
    return this.dictionary.autocomplete(q, limit);
  }

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.dictionary.search(q, page, limit);
  }

  @Get('entries/:id')
  detail(@Param('id') id: string) {
    return this.dictionary.detail(id);
  }
}
