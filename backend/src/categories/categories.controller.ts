import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('categories')
  list() {
    return this.categories.listCategories();
  }

  @Get('categories/:idOrSlug/sentences')
  sentences(
    @Param('idOrSlug') idOrSlug: string,
    @Query('level') level: string | undefined,
    @Query('q') q: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.categories.listSentences(idOrSlug, level, q, page, limit);
  }

  @Get('sentences/:id')
  sentence(@Param('id') id: string) {
    return this.categories.getSentence(id);
  }
}
