import { Module } from '@nestjs/common';
import { LogiguayController } from './logiguay.controller';

/**
 * Logiguay vertical — fleet tracking & logistics
 * Extends core with geofences, driver management, route history.
 */
@Module({
  controllers: [LogiguayController],
})
export class LogiguayModule {}
