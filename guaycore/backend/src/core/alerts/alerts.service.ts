import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertStatus } from './entities/alert.entity';
import { EventSeverity } from '../../shared/types';

export interface CreateAlertDto {
  tenantId:  string;
  deviceId:  string;
  ruleId?:   string;
  title:     string;
  message?:  string;
  severity:  EventSeverity;
  context?:  Record<string, unknown>;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly repo: Repository<Alert>,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    return this.repo.save(this.repo.create({
      tenantId: dto.tenantId,
      deviceId: dto.deviceId,
      ruleId:   dto.ruleId,
      title:    dto.title,
      message:  dto.message,
      severity: dto.severity,
      context:  dto.context ?? {},
    }));
  }

  async findAll(tenantId: string, opts?: {
    deviceId?: string;
    status?:   AlertStatus;
    severity?: EventSeverity;
    limit?:    number;
  }): Promise<Alert[]> {
    const qb = this.repo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId })
      .orderBy('a.createdAt', 'DESC')
      .take(opts?.limit ?? 100);

    if (opts?.deviceId) qb.andWhere('a.deviceId = :deviceId', { deviceId: opts.deviceId });
    if (opts?.status)   qb.andWhere('a.status = :status',     { status:   opts.status });
    if (opts?.severity) qb.andWhere('a.severity = :severity', { severity: opts.severity });

    return qb.getMany();
  }

  async ack(tenantId: string, id: string, userId: string): Promise<Alert> {
    await this.repo.update(
      { id, tenantId },
      { status: AlertStatus.ACKED, ackedBy: userId, ackedAt: new Date() },
    );
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async resolve(tenantId: string, id: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { status: AlertStatus.RESOLVED });
  }
}
