import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { TenantId, CurrentUser } from '../../shared/decorators/tenant.decorator';
import { Roles } from '../../shared/guards/roles.guard';
import { UserRole, DeviceStatus } from '../../shared/types';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  // POST /devices — registrar nuevo dispositivo
  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Registrar dispositivo y obtener credenciales MQTT' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: {
      name:        string;
      vertical?:   string;
      deviceType?: string;
      tags?:       Record<string, string>;
    },
  ) {
    // Devuelve el plainSecret UNA SOLA VEZ — guardarlo como contraseña MQTT
    return this.svc.create(tenantId, dto);
  }

  // GET /devices
  @Get()
  @ApiOperation({ summary: 'Listar dispositivos del tenant' })
  findAll(
    @TenantId()      tenantId: string,
    @Query('status') status?:  DeviceStatus,
    @Query('vertical') vertical?: string,
  ) {
    return this.svc.findAll(tenantId, { status, vertical });
  }

  // GET /devices/:id
  @Get(':id')
  @ApiOperation({ summary: 'Obtener dispositivo por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOne(tenantId, id);
  }

  // PATCH /devices/:id/config — push config remota via MQTT
  @Patch(':id/config')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Enviar configuración remota al dispositivo via MQTT' })
  pushConfig(
    @TenantId()    tenantId: string,
    @Param('id')   deviceId: string,
    @Body()        config:   Record<string, unknown>,
  ) {
    return this.svc.pushConfig(tenantId, deviceId, config);
  }
}
