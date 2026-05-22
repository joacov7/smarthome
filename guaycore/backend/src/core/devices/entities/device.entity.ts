import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { DeviceStatus } from '../../../shared/types';

@Entity('devices')
@Index(['tenantId', 'deviceKey'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  // Clave MQTT única del dispositivo (usada como username en el broker)
  @Column({ unique: true })
  deviceKey: string;

  // Secret para autenticación MQTT — hasheado
  @Column()
  deviceSecret: string;

  @Column()
  name: string;

  // Vertical al que pertenece: guayhome, logiguay, guaycold, etc.
  @Column({ nullable: true })
  vertical: string;

  // Tipo de dispositivo definido por la vertical: relay_module, gps_tracker, temp_sensor
  @Column({ nullable: true })
  deviceType: string;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.PROVISIONING })
  status: DeviceStatus;

  @Column({ nullable: true })
  firmwareVersion: string;

  @Column({ nullable: true })
  hardwareModel: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  lastSeenAt: Date;

  // Configuración remota — se publica via MQTT al dispositivo
  @Column({ type: 'jsonb', default: {} })
  remoteConfig: Record<string, unknown>;

  // Capacidades declaradas por el dispositivo en el provisioning
  @Column({ type: 'jsonb', default: [] })
  capabilities: string[];  // ej: ['gps', 'temperature', 'relay', 'ota']

  // Tags libres para agrupar/filtrar
  @Column({ type: 'jsonb', default: {} })
  tags: Record<string, string>;

  // Metadatos de la vertical (ej: placa, chofer, zona)
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
