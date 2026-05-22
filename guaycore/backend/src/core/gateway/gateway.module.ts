import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TelemetryGateway } from './telemetry.gateway';

@Module({
  imports:   [JwtModule.register({})],
  providers: [TelemetryGateway],
})
export class GatewayModule {}
