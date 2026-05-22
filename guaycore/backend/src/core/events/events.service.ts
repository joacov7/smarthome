import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEvent } from './entities/event.entity';
import { EventSeverity } from '../../shared/types';

export interface CreateEventDto {
  tenantId:       string;
  deviceId:       string;
  type:           string;
  severity:       EventSeverity;
  data?:          Record<string, unknown>;
  correlationId?: string;
}

export interface QueryEventsDto {
  tenantId:  string;
  deviceId?: string;
  severity?: EventSeverity;
  from?:     Date;
  to?:       Date;
  limit?:    number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(DeviceEvent) private readonly repo: Repository<DeviceEvent>,
  ) {}

  async create(dto: CreateEventDto): Promise<DeviceEvent> {
    return this.repo.save(
      this.repo.create({
        tenantId:      dto.tenantId,
        deviceId:      dto.deviceId,
        type:          dto.type,
        severity:      dto.severity,
        data:          dto.data ?? {},
        correlationId: dto.correlationId,
      })
    );
  }

  async findAll(dto: QueryEventsDto): Promise<DeviceEvent[]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: dto.tenantId })
      .orderBy('e.createdAt', 'DESC')
      .take(dto.limit ?? 100);

    if (dto.deviceId) qb.andWhere('e.deviceId = :deviceId', { deviceId: dto.deviceId });
    if (dto.severity) qb.andWhere('e.severity = :severity', { severity: dto.severity });
    if (dto.from)     qb.andWhere('e.createdAt >= :from',   { from: dto.from });
    if (dto.to)       qb.andWhere('e.createdAt <= :to',     { to:   dto.to   });

    return qb.getMany();
  }

  async markProcessed(id: string): Promise<void> {
    await this.repo.update(id, { processed: true });
  }
}
