import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum OtaCampaignStatus {
  DRAFT      = 'draft',
  ACTIVE     = 'active',
  PAUSED     = 'paused',
  COMPLETED  = 'completed',
  ROLLED_BACK = 'rolled_back',
}

@Entity('firmware_versions')
export class FirmwareVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  version: string;      // semver: 1.2.3

  @Column()
  hardwareModel: string;

  @Column()
  downloadUrl: string;   // URL del binario (.bin)

  @Column()
  sha256: string;        // checksum para verificación en el dispositivo

  @Column()
  sizeBytes: number;

  @Column({ nullable: true })
  changelog: string;

  @Column({ default: false })
  isStable: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('ota_campaigns')
@Index(['tenantId', 'status'])
export class OtaCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  name: string;

  // Versión de firmware a desplegar
  @Column()
  firmwareVersionId: string;

  // Filtros de target: null = todos, o lista de deviceIds, o por tag
  @Column({ type: 'jsonb', default: {} })
  targetFilter: {
    deviceIds?: string[];
    tags?:      Record<string, string>;
    hardwareModel?: string;
  };

  @Column({
    type: 'enum',
    enum: OtaCampaignStatus,
    default: OtaCampaignStatus.DRAFT,
  })
  status: OtaCampaignStatus;

  // Progreso: { total, pending, updating, success, failed }
  @Column({ type: 'jsonb', default: {} })
  progress: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
