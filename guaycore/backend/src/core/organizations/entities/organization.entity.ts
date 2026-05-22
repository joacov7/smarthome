import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { PlanTier } from '../../../shared/types';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;          // identificador URL-friendly

  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'enum', enum: PlanTier, default: PlanTier.FREE })
  plan: PlanTier;

  // Límites del plan — configurables por tenant
  @Column({ type: 'jsonb', default: {
    maxDevices:   10,
    maxUsers:     5,
    retentionDays: 30,
    apiRateLimit: 1000,
  }})
  planLimits: {
    maxDevices:    number;
    maxUsers:      number;
    retentionDays: number;
    apiRateLimit:  number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
