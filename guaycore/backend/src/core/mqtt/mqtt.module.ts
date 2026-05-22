import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttHandlers } from './mqtt.handlers';
import { MqttAuthController } from './mqtt-auth.controller';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { EventsModule } from '../events/events.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    forwardRef(() => TelemetryModule),
    forwardRef(() => EventsModule),
    forwardRef(() => DevicesModule),
  ],
  providers:   [MqttService, MqttHandlers],
  controllers: [MqttAuthController],
  exports:     [MqttService],
})
export class MqttModule {}
