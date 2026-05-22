import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { EventsService } from '../events/events.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceEventPayload, TelemetryPayload, EventSeverity } from '../../shared/types';

// ============================================================
//  MqttHandlers — conecta el broker con los servicios del core
//
//  Flujo por topic:
//    /telemetry → TelemetryService.ingest()  → DB + RulesEngine
//    /events    → EventsService.create()     → DB
//    /status    → DevicesService.heartbeat() o markOffline()
// ============================================================

@Injectable()
export class MqttHandlers implements OnModuleInit {
  private readonly logger = new Logger(MqttHandlers.name);

  constructor(
    private readonly mqtt:      MqttService,
    private readonly telemetry: TelemetryService,
    private readonly events:    EventsService,
    private readonly devices:   DevicesService,
  ) {}

  onModuleInit() {
    this.mqtt.onTopic('telemetry', this.handleTelemetry.bind(this));
    this.mqtt.onTopic('events',    this.handleEvent.bind(this));
    this.mqtt.onTopic('status',    this.handleStatus.bind(this));
    this.logger.log('MQTT handlers registrados');
  }

  // ── /telemetry ─────────────────────────────────────────────
  private async handleTelemetry(tenantId: string, deviceKey: string, raw: Buffer) {
    let payload: TelemetryPayload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      this.logger.warn(`Telemetría malformada de ${deviceKey}`);
      return;
    }

    // Resolver deviceId desde deviceKey (con cache interno en DevicesService)
    const device = await this.devices.findByKey(deviceKey);
    if (!device || device.tenantId !== tenantId) return;

    await this.telemetry.ingest({
      tenantId,
      deviceId: device.id,
      payload,
    });
  }

  // ── /events ────────────────────────────────────────────────
  private async handleEvent(tenantId: string, deviceKey: string, raw: Buffer) {
    let payload: DeviceEventPayload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      this.logger.warn(`Evento malformado de ${deviceKey}`);
      return;
    }

    const device = await this.devices.findByKey(deviceKey);
    if (!device || device.tenantId !== tenantId) return;

    await this.events.create({
      tenantId,
      deviceId:  device.id,
      type:      payload.type,
      severity:  payload.severity ?? EventSeverity.INFO,
      data:      payload.data ?? {},
    });
  }

  // ── /status (LWT) ──────────────────────────────────────────
  // El dispositivo publica "online" al conectar y EMQX publica
  // "offline" via LWT cuando se desconecta inesperadamente.
  private async handleStatus(tenantId: string, deviceKey: string, raw: Buffer) {
    const status = raw.toString().trim().toLowerCase();
    const device = await this.devices.findByKey(deviceKey);
    if (!device || device.tenantId !== tenantId) return;

    if (status === 'offline') {
      await this.devices.markOffline(device.id);
    } else {
      // "online" o cualquier payload con datos de heartbeat
      try {
        const data = JSON.parse(raw.toString());
        await this.devices.heartbeat(device.id, data);
      } catch {
        await this.devices.heartbeat(device.id);
      }
    }
  }
}
