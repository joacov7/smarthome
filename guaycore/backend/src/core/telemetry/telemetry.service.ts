import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Telemetry } from './entities/telemetry.entity';
import { RulesEngine } from '../rules/rules.engine';
import { TelemetryPayload } from '../../shared/types';

export interface IngestDto {
  tenantId: string;
  deviceId: string;
  payload:  TelemetryPayload;
}

export interface TelemetryQueryDto {
  tenantId:  string;
  deviceId:  string;
  from:      Date;
  to:        Date;
  limit?:    number;
  fields?:   string[];   // si se especifica, solo devuelve esas keys del JSONB
}

export interface TelemetryLatestDto {
  tenantId: string;
  deviceId: string;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(Telemetry) private readonly repo: Repository<Telemetry>,
    @InjectDataSource()          private readonly ds:   DataSource,
    private readonly rules:      RulesEngine,
    private readonly emitter:    EventEmitter2,
  ) {}

  // ── Ingesta — punto de entrada de cada mensaje MQTT ────────
  async ingest(dto: IngestDto): Promise<void> {
    const { tenantId, deviceId, payload } = dto;

    // ts viene del dispositivo si lo envía; si no, usamos NOW()
    const ts = payload.ts ? new Date(payload.ts) : new Date();

    // Clonar sin el campo ts para guardar en data limpio
    const { ts: _ts, ...data } = payload;

    // Guardar en TimescaleDB
    // Usamos INSERT ON CONFLICT DO NOTHING para idempotencia
    // (mismo device + mismo ts = duplicado, lo ignoramos)
    await this.ds.query(
      `INSERT INTO telemetry (ts, device_id, tenant_id, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ts, device_id) DO NOTHING`,
      [ts, deviceId, tenantId, data]
    );

    // Emitir evento interno para WebSocket en tiempo real
    this.emitter.emit('telemetry.received', { tenantId, deviceId, ts, data });

    // Evaluar reglas de forma asíncrona (no bloqueamos la ingesta)
    this.rules.evaluate({ tenantId, deviceId, data, ts }).catch(err =>
      this.logger.error(`Rules engine error device=${deviceId}`, err)
    );
  }

  // ── Consulta de serie de tiempo ────────────────────────────
  // Usa TimescaleDB time_bucket para agregación eficiente
  async query(dto: TelemetryQueryDto): Promise<Telemetry[]> {
    const { tenantId, deviceId, from, to, limit = 1000 } = dto;

    return this.repo.find({
      where: {
        tenantId,
        deviceId,
        ts: Between(from, to),
      },
      order:  { ts: 'DESC' },
      take:   limit,
    });
  }

  // ── Último valor conocido por dispositivo ──────────────────
  async latest(dto: TelemetryLatestDto): Promise<Telemetry | null> {
    return this.repo.findOne({
      where: { tenantId: dto.tenantId, deviceId: dto.deviceId },
      order: { ts: 'DESC' },
    });
  }

  // ── Agregación con time_bucket (TimescaleDB) ───────────────
  // Devuelve medias por ventana de tiempo — útil para gráficos
  async aggregate(opts: {
    tenantId:  string;
    deviceId:  string;
    from:      Date;
    to:        Date;
    field:     string;       // key del JSONB a agregar: "temp", "voltage"
    bucketSec: number;       // ventana en segundos: 60, 300, 3600
  }): Promise<{ bucket: Date; avg: number; min: number; max: number }[]> {
    const { tenantId, deviceId, from, to, field, bucketSec } = opts;

    const rows = await this.ds.query(
      `SELECT
         time_bucket($1::interval, ts)          AS bucket,
         AVG((data->>'${field}')::numeric)      AS avg,
         MIN((data->>'${field}')::numeric)      AS min,
         MAX((data->>'${field}')::numeric)      AS max
       FROM telemetry
       WHERE tenant_id = $2
         AND device_id = $3
         AND ts BETWEEN $4 AND $5
         AND data ? '${field}'
       GROUP BY bucket
       ORDER BY bucket ASC`,
      [`${bucketSec} seconds`, tenantId, deviceId, from, to]
    );

    return rows;
  }

  // ── Stats de resumen (para dashboard home) ─────────────────
  async summary(tenantId: string, deviceId: string, since: Date): Promise<{
    count:    number;
    firstTs:  Date | null;
    lastTs:   Date | null;
  }> {
    const row = await this.ds.query(
      `SELECT COUNT(*)::int AS count, MIN(ts) AS first_ts, MAX(ts) AS last_ts
       FROM telemetry
       WHERE tenant_id = $1 AND device_id = $2 AND ts >= $3`,
      [tenantId, deviceId, since]
    );
    return {
      count:   row[0]?.count   ?? 0,
      firstTs: row[0]?.first_ts ?? null,
      lastTs:  row[0]?.last_ts  ?? null,
    };
  }
}
