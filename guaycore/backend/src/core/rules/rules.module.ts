import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesEngine } from './rules.engine';
import { RulesController } from './rules.controller';
import { Rule } from './entities/rule.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Rule])],
  providers:   [RulesEngine],
  controllers: [RulesController],
  exports:     [RulesEngine],
})
export class RulesModule {}
