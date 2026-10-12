import { GrammarModule } from './grammar/grammar.module';
import { PracticeModule } from './practice/practice.module';
import { CategoriesModule } from './categories/categories.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DictionaryModule } from './dictionary/dictionary.module';

@Module({
  imports: [GrammarModule, PracticeModule, CategoriesModule, ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, DictionaryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
