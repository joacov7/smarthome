import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { DeviceEvent } from './entities/event.entity';

@Module({
  imports:   [TypeOrmModule.forFeature([DeviceEvent])],
  providers: [EventsService],
  exports:   [EventsService],
})
export class EventsModule {}
