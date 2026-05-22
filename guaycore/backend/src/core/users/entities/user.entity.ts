import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../../shared/types';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant isolation — todas las queries filtran por esto
  @Column()
  @Index()
  tenantId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  email: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column()
  @Exclude()            // nunca exponer en responses HTTP
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ORG_MEMBER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  // Para audit trail
  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
