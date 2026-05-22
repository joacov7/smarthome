import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesEngine } from './rules.engine';
import { Rule } from './entities/rule.entity';

@Module({
  imports:   [TypeOrmModule.forFeature([Rule])],
  providers: [RulesEngine],
  exports:   [RulesEngine],
})
export class RulesModule {}
