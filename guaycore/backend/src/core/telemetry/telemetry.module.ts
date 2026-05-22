import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { Telemetry } from './entities/telemetry.entity';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Telemetry]),
    EventEmitterModule.forRoot(),
    forwardRef(() => RulesModule),
  ],
  providers:   [TelemetryService],
  controllers: [TelemetryController],
  exports:     [TelemetryService],
})
export class TelemetryModule {}
