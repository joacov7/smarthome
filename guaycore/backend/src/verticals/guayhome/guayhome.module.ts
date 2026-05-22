import { Module } from '@nestjs/common';
import { GuayHomeController } from './guayhome.controller';

/**
 * GuayHome vertical — smart home automation
 * Builds on core DevicesModule + TelemetryModule + RulesModule.
 * Adds home-specific concepts: rooms, scenes, presence.
 */
@Module({
  controllers: [GuayHomeController],
})
export class GuayHomeModule {}
