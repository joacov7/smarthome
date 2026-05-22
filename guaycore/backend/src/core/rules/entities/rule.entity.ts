import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { RuleConditionOperator, RuleActionType } from '../../../shared/types';

// ── Rule Condition ────────────────────────────────────────────
// Ejemplo: { field: 'temp', operator: 'gt', value: 30, unit: '°C' }
export interface RuleCondition {
  field:    string;
  operator: RuleConditionOperator;
  value:    unknown;
  unit?:    string;
}

// ── Rule Action ───────────────────────────────────────────────
// Ejemplo: { type: 'send_alert', params: { message: 'Temperatura alta' } }
export interface RuleAction {
  type:   RuleActionType;
  params: Record<string, unknown>;
}

@Entity('rules')
@Index(['tenantId', 'isActive'])
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Filtro de dispositivos: null = todos, o deviceId específico, o por tag
  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  deviceTag: string;

  // Condiciones: SI (todas se cumplen → AND, configurable)
  @Column({ type: 'jsonb' })
  conditions: RuleCondition[];

  // 'and' | 'or'
  @Column({ default: 'and' })
  conditionLogic: string;

  // Acciones: ENTONCES (se ejecutan en orden)
  @Column({ type: 'jsonb' })
  actions: RuleAction[];

  // Anti-spam: no re-disparar antes de N segundos
  @Column({ default: 300 })
  cooldownSeconds: number;

  @Column({ nullable: true })
  lastTriggeredAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
