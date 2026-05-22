import {
  Controller, Get, Param, Query, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';

@ApiTags('telemetry')
@ApiBearerAuth()
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly svc: TelemetryService) {}

  // GET /telemetry/:deviceId?from=&to=&limit=
  @Get(':deviceId')
  @ApiOperation({ summary: 'Consultar serie de tiempo de un dispositivo' })
  @ApiQuery({ name: 'from',  required: false, example: '2024-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to',    required: false, example: '2024-01-02T00:00:00Z' })
  @ApiQuery({ name: 'limit', required: false, example: 500 })
  query(
    @TenantId()       tenantId: string,
    @Param('deviceId') deviceId: string,
    @Query('from')     from?: string,
    @Query('to')       to?:   string,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit = 500,
  ) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);

    return this.svc.query({
      tenantId,
      deviceId,
      from:  from ? new Date(from) : yesterday,
      to:    to   ? new Date(to)   : now,
      limit: Math.min(limit, 5000),
    });
  }

  // GET /telemetry/:deviceId/latest
  @Get(':deviceId/latest')
  @ApiOperation({ summary: 'Último valor conocido del dispositivo' })
  latest(
    @TenantId()        tenantId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.svc.latest({ tenantId, deviceId });
  }

  // GET /telemetry/:deviceId/aggregate?field=temp&bucket=300&from=&to=
  @Get(':deviceId/aggregate')
  @ApiOperation({ summary: 'Agregación time_bucket (TimescaleDB)' })
  @ApiQuery({ name: 'field',  required: true,  example: 'temp' })
  @ApiQuery({ name: 'bucket', required: false,  example: 300, description: 'Ventana en segundos' })
  aggregate(
    @TenantId()        tenantId: string,
    @Param('deviceId') deviceId: string,
    @Query('field')    field:     string,
    @Query('bucket', new DefaultValuePipe(300), ParseIntPipe) bucketSec = 300,
    @Query('from')     from?: string,
    @Query('to')       to?:   string,
  ) {
    const now = new Date();
    return this.svc.aggregate({
      tenantId,
      deviceId,
      field,
      bucketSec,
      from: from ? new Date(from) : new Date(now.getTime() - 86_400_000),
      to:   to   ? new Date(to)   : now,
    });
  }

  // GET /telemetry/:deviceId/summary?since=
  @Get(':deviceId/summary')
  @ApiOperation({ summary: 'Resumen de actividad del dispositivo' })
  summary(
    @TenantId()        tenantId: string,
    @Param('deviceId') deviceId: string,
    @Query('since')    since?: string,
  ) {
    const defaultSince = new Date(Date.now() - 7 * 86_400_000); // 7 días
    return this.svc.summary(tenantId, deviceId, since ? new Date(since) : defaultSince);
  }
}
