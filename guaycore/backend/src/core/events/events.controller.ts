import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { EventSeverity } from '../../shared/types';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos del tenant' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: EventSeverity })
  @ApiQuery({ name: 'from',     required: false })
  @ApiQuery({ name: 'to',       required: false })
  @ApiQuery({ name: 'limit',    required: false })
  findAll(
    @TenantId()        tenantId:  string,
    @Query('deviceId') deviceId?: string,
    @Query('severity') severity?: EventSeverity,
    @Query('from')     from?:     string,
    @Query('to')       to?:       string,
    @Query('limit')    limit?:    number,
  ) {
    return this.svc.findAll({
      tenantId,
      deviceId,
      severity,
      from:  from  ? new Date(from)  : undefined,
      to:    to    ? new Date(to)    : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Patch(':id/processed')
  @ApiOperation({ summary: 'Marcar evento como procesado' })
  markProcessed(@Param('id') id: string) {
    return this.svc.markProcessed(id);
  }
}
