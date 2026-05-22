import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { MqttService } from '../../core/mqtt/mqtt.service';

import { RoomsService, CreateRoomDto, UpdateRoomDto } from './rooms.service';
import { ScenesService, CreateSceneDto, UpdateSceneDto } from './scenes.service';
import { HomeDevicesService, AssignHomeDeviceDto } from './home-devices.service';

@ApiTags('vertical/guayhome')
@ApiBearerAuth()
@Controller('guayhome')
export class GuayHomeController {
  constructor(
    private readonly rooms:       RoomsService,
    private readonly scenes:      ScenesService,
    private readonly homeDevices: HomeDevicesService,
    private readonly mqtt:        MqttService,
  ) {}

  // ── Health ────────────────────────────────────────────────────

  @Get('health')
  @ApiOperation({ summary: 'GuayHome vertical health check' })
  health(@TenantId() _tenantId: string) {
    return { vertical: 'guayhome', status: 'active' };
  }

  // ── Rooms ─────────────────────────────────────────────────────

  @Get('rooms')
  @ApiOperation({ summary: 'List all rooms for the tenant' })
  findAllRooms(@TenantId() tenantId: string) {
    return this.rooms.findAll(tenantId);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create a room' })
  createRoom(
    @TenantId() tenantId: string,
    @Body()     dto:      CreateRoomDto,
  ) {
    return this.rooms.create(tenantId, dto);
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Update a room' })
  updateRoom(
    @TenantId()  tenantId: string,
    @Param('id') id:       string,
    @Body()      dto:      UpdateRoomDto,
  ) {
    return this.rooms.update(tenantId, id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room' })
  removeRoom(
    @TenantId()  tenantId: string,
    @Param('id') id:       string,
  ) {
    return this.rooms.remove(tenantId, id);
  }

  // ── Scenes ────────────────────────────────────────────────────

  @Get('scenes')
  @ApiOperation({ summary: 'List all scenes for the tenant' })
  findAllScenes(@TenantId() tenantId: string) {
    return this.scenes.findAll(tenantId);
  }

  @Post('scenes')
  @ApiOperation({ summary: 'Create a scene' })
  createScene(
    @TenantId() tenantId: string,
    @Body()     dto:      CreateSceneDto,
  ) {
    return this.scenes.create(tenantId, dto);
  }

  @Patch('scenes/:id')
  @ApiOperation({ summary: 'Update a scene' })
  updateScene(
    @TenantId()  tenantId: string,
    @Param('id') id:       string,
    @Body()      dto:      UpdateSceneDto,
  ) {
    return this.scenes.update(tenantId, id, dto);
  }

  @Delete('scenes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scene' })
  removeScene(
    @TenantId()  tenantId: string,
    @Param('id') id:       string,
  ) {
    return this.scenes.remove(tenantId, id);
  }

  @Post('scenes/:id/execute')
  @ApiOperation({ summary: 'Execute a scene — sends MQTT commands for all actions' })
  executeScene(
    @TenantId()  tenantId: string,
    @Param('id') id:       string,
  ) {
    return this.scenes.execute(tenantId, id, this.mqtt);
  }

  // ── Home Devices ──────────────────────────────────────────────

  @Get('home-devices')
  @ApiOperation({ summary: 'List home devices, optionally filtered by roomId' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Filter by room UUID' })
  findAllHomeDevices(
    @TenantId()        tenantId: string,
    @Query('roomId')   roomId?:  string,
  ) {
    return this.homeDevices.findAll(tenantId, roomId);
  }

  @Post('home-devices')
  @ApiOperation({ summary: 'Assign or update a device in the GuayHome vertical' })
  assignHomeDevice(
    @TenantId()          tenantId: string,
    @Body()              dto:      AssignHomeDeviceDto & { deviceId: string },
  ) {
    const { deviceId, ...rest } = dto;
    return this.homeDevices.assign(tenantId, deviceId, rest);
  }

  @Delete('home-devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a device from the GuayHome vertical' })
  unassignHomeDevice(
    @TenantId()           tenantId: string,
    @Param('deviceId')    deviceId: string,
  ) {
    return this.homeDevices.unassign(tenantId, deviceId);
  }
}
