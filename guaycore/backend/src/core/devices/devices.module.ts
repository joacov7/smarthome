import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { Device } from './entities/device.entity';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    forwardRef(() => MqttModule),
  ],
  providers:   [DevicesService],
  controllers: [DevicesController],
  exports:     [DevicesService],
})
export class DevicesModule {}
