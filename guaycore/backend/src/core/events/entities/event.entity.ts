import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';
import { EventSeverity } from '../../../shared/types';

@Entity('device_events')
@Index(['tenantId', 'deviceId', 'createdAt'])
@Index(['tenantId', 'severity', 'createdAt'])
export class DeviceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  @Index()
  deviceId: string;

  // Tipo de evento: door_opened, temp_alert, offline, ota_complete, etc.
  @Column()
  type: string;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  // Para correlacionar eventos relacionados (ej: alerta → ack → resolución)
  @Column({ nullable: true })
  correlationId: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  // true = ya fue procesado por el rules engine
  @Column({ default: false })
  processed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
