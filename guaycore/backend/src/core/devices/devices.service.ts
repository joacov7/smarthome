import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Device } from './entities/device.entity';
import { DeviceStatus } from '../../shared/types';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device) private devicesRepo: Repository<Device>,
    private mqttService: MqttService,
  ) {}

  // ── Registro / Provisioning ────────────────────────────────
  async create(tenantId: string, dto: {
    name:        string;
    vertical?:   string;
    deviceType?: string;
    tags?:       Record<string, string>;
    metadata?:   Record<string, unknown>;
  }): Promise<Device & { plainSecret: string }> {
    const deviceKey    = `${tenantId.slice(0, 8)}-${uuidv4().slice(0, 12)}`;
    const plainSecret  = uuidv4();
    const deviceSecret = await bcrypt.hash(plainSecret, 10);

    const device = await this.devicesRepo.save(
      this.devicesRepo.create({
        tenantId,
        deviceKey,
        deviceSecret,
        name:       dto.name,
        vertical:   dto.vertical,
        deviceType: dto.deviceType,
        tags:       dto.tags    ?? {},
        metadata:   dto.metadata ?? {},
        status:     DeviceStatus.PROVISIONING,
      })
    );

    this.logger.log(`Dispositivo registrado: ${deviceKey} (tenant=${tenantId})`);

    // Devolver el secret en texto plano SOLO en la creación
    return { ...device, plainSecret };
  }

  // ── Heartbeat — el dispositivo anuncia que sigue vivo ──────
  async heartbeat(deviceId: string, data?: {
    firmwareVersion?: string;
    ipAddress?:       string;
    rssi?:            number;
  }): Promise<void> {
    await this.devicesRepo.update(deviceId, {
      status:          DeviceStatus.ONLINE,
      lastSeenAt:      new Date(),
      firmwareVersion: data?.firmwareVersion,
      ipAddress:       data?.ipAddress,
    });
  }

  // ── Marcar offline (llamado desde LWT MQTT handler) ────────
  async markOffline(deviceId: string): Promise<void> {
    await this.devicesRepo.update(deviceId, { status: DeviceStatus.OFFLINE });
    this.logger.warn(`Dispositivo offline: ${deviceId}`);
  }

  // ── Config remota — publica via MQTT ──────────────────────
  async pushConfig(tenantId: string, deviceId: string, config: Record<string, unknown>): Promise<void> {
    const device = await this.findOne(tenantId, deviceId);
    await this.devicesRepo.update(deviceId, { remoteConfig: config });
    this.mqttService.publish(tenantId, device.deviceKey, 'config', config);
  }

  // ── Autenticación MQTT (llamado por el hook de EMQX) ──────
  async authenticateMqtt(deviceKey: string, secret: string): Promise<boolean> {
    const device = await this.devicesRepo.findOne({ where: { deviceKey, isActive: true } });
    if (!device) return false;
    return bcrypt.compare(secret, device.deviceSecret);
  }

  // ── Queries ───────────────────────────────────────────────
  async findAll(tenantId: string, filters?: {
    status?:   DeviceStatus;
    vertical?: string;
    tag?:      string;
  }): Promise<Device[]> {
    const qb = this.devicesRepo.createQueryBuilder('d')
      .where('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.isActive = true');

    if (filters?.status)   qb.andWhere('d.status = :status',     { status:   filters.status });
    if (filters?.vertical) qb.andWhere('d.vertical = :vertical', { vertical: filters.vertical });
    if (filters?.tag)      qb.andWhere("d.tags ? :tag",          { tag:      filters.tag });

    return qb.orderBy('d.createdAt', 'DESC').getMany();
  }

  async findOne(tenantId: string, deviceId: string): Promise<Device> {
    const device = await this.devicesRepo.findOne({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return device;
  }

  async findByKey(deviceKey: string): Promise<Device | null> {
    return this.devicesRepo.findOne({ where: { deviceKey, isActive: true } });
  }
}
