import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Room }       from './entities/room.entity';
import { Scene }      from './entities/scene.entity';
import { HomeDevice } from './entities/home-device.entity';

import { RoomsService }       from './rooms.service';
import { ScenesService }      from './scenes.service';
import { HomeDevicesService } from './home-devices.service';
import { GuayHomeController } from './guayhome.controller';

import { MqttModule } from '../../core/mqtt/mqtt.module';

/**
 * GuayHomeModule — smart home automation vertical.
 *
 * Adds home-specific concepts on top of GuayCore:
 *   - Rooms   : physical spaces (living room, bedroom, etc.)
 *   - Scenes  : named sequences of device commands triggered as a unit
 *   - HomeDevices : links core Device records into a room with UI metadata
 *
 * Depends on MqttModule (forwardRef to avoid circular deps) to publish
 * scene commands to guay/{tenantId}/device/{deviceId}/commands.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Room, Scene, HomeDevice]),
    forwardRef(() => MqttModule),
  ],
  providers: [
    RoomsService,
    ScenesService,
    HomeDevicesService,
  ],
  controllers: [GuayHomeController],
  exports: [
    RoomsService,
    ScenesService,
    HomeDevicesService,
  ],
})
export class GuayHomeModule {}
