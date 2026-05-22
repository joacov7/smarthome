import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export interface SceneAction {
  deviceId: string;
  command: Record<string, unknown>;
  delayMs?: number;
}

@Entity('guayhome_scenes')
@Index(['tenantId'])
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  // Each action: { deviceId, command: Record<string, unknown>, delayMs? }
  @Column({ type: 'jsonb', default: [] })
  actions: SceneAction[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
