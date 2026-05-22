import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { EventSeverity } from '../../../shared/types';

export enum AlertStatus {
  OPEN       = 'open',
  ACKED      = 'acked',
  RESOLVED   = 'resolved',
}

@Entity('alerts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'deviceId'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  ruleId?: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OPEN })
  status: AlertStatus;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, unknown>;

  @Column({ nullable: true })
  ackedBy?: string;

  @Column({ nullable: true })
  ackedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
