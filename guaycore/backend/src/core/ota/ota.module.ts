import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirmwareVersion, OtaCampaign } from './entities/firmware.entity';
import { OtaService } from './ota.service';
import { OtaController } from './ota.controller';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FirmwareVersion, OtaCampaign]),
    MqttModule,
  ],
  providers:   [OtaService],
  controllers: [OtaController],
  exports:     [OtaService],
})
export class OtaModule {}
