import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService, } from './alerts.service';
import { AlertStatus } from './entities/alert.entity';
import { TenantId, CurrentUser } from '../../shared/decorators/tenant.decorator';
import { RequestContext, EventSeverity } from '../../shared/types';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas del tenant' })
  findAll(
    @TenantId()          tenantId:  string,
    @Query('deviceId')   deviceId?: string,
    @Query('status')     status?:   AlertStatus,
    @Query('severity')   severity?: EventSeverity,
    @Query('limit')      limit?:    number,
  ) {
    return this.svc.findAll(tenantId, { deviceId, status, severity, limit });
  }

  @Patch(':id/ack')
  @ApiOperation({ summary: 'Reconocer alerta' })
  ack(
    @TenantId()      tenantId: string,
    @CurrentUser()   ctx:      RequestContext,
    @Param('id')     id:       string,
  ) {
    return this.svc.ack(tenantId, id, ctx.userId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolver alerta' })
  resolve(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.resolve(tenantId, id);
  }
}
