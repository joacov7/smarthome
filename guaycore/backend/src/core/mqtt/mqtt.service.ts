import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';

// ============================================================
//  GuayCore MQTT Service
//
//  Topic schema:
//    guay/{tenantId}/device/{deviceId}/telemetry   ← dispositivo publica
//    guay/{tenantId}/device/{deviceId}/events      ← dispositivo publica
//    guay/{tenantId}/device/{deviceId}/commands    → backend publica
//    guay/{tenantId}/device/{deviceId}/config      → backend publica
//    guay/{tenantId}/device/{deviceId}/ota         → backend publica
//    guay/{tenantId}/device/{deviceId}/status      ← LWT del dispositivo
// ============================================================

type TopicHandler = (tenantId: string, deviceId: string, payload: Buffer) => void;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;

  // Registro de handlers por tipo de topic
  private readonly handlers = new Map<string, TopicHandler>();

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url      = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883');
    const username = this.config.get<string>('MQTT_USERNAME');
    const password = this.config.get<string>('MQTT_PASSWORD');

    this.client = mqtt.connect(url, {
      username,
      password,
      clientId:       `guaycore-backend-${Date.now()}`,
      clean:          true,
      reconnectPeriod: 3000,
      connectTimeout:  10000,
      queueQoSZero:   true,
    });

    this.client.on('connect', () => {
      this.logger.log(`MQTT conectado a ${url}`);
      this.subscribeAll();
    });

    this.client.on('reconnect', () => this.logger.warn('MQTT reconectando...'));
    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
    this.client.on('message', this.handleMessage.bind(this));
  }

  async onModuleDestroy() {
    this.client?.end(true);
  }

  // ── Suscripciones ──────────────────────────────────────────
  private subscribeAll() {
    // Wildcard: escucha todo del namespace guay/
    // QoS 1 garantiza entrega at-least-once
    this.client.subscribe('guay/+/device/+/telemetry', { qos: 1 });
    this.client.subscribe('guay/+/device/+/events',    { qos: 1 });
    this.client.subscribe('guay/+/device/+/status',    { qos: 1 });
    this.logger.log('MQTT suscripto a topics de telemetría, eventos y status');
  }

  // ── Router de mensajes entrantes ───────────────────────────
  private handleMessage(topic: string, payload: Buffer) {
    // Parsear: guay/{tenantId}/device/{deviceId}/{type}
    const parts = topic.split('/');
    if (parts.length !== 5 || parts[0] !== 'guay' || parts[2] !== 'device') return;

    const [, tenantId, , deviceId, type] = parts;
    const handler = this.handlers.get(type);
    if (handler) {
      try {
        handler(tenantId, deviceId, payload);
      } catch (err) {
        this.logger.error(`Error en handler [${type}] device=${deviceId}`, err);
      }
    }
  }

  // ── API pública para registrar handlers ────────────────────
  onTopic(type: 'telemetry' | 'events' | 'status', handler: TopicHandler) {
    this.handlers.set(type, handler);
  }

  // ── Publicación hacia dispositivos ─────────────────────────
  publish(tenantId: string, deviceId: string, type: 'commands' | 'config' | 'ota', payload: object) {
    const topic = `guay/${tenantId}/device/${deviceId}/${type}`;
    const msg   = JSON.stringify(payload);
    this.client.publish(topic, msg, { qos: 1, retain: type === 'config' });
    this.logger.debug(`→ ${topic}`);
  }

  // ── Endpoint interno: EMQX llama esto para autenticar dispositivos ──
  // Lógica real en MqttAuthController
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
