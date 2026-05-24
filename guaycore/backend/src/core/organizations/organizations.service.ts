import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { PlanTier } from '../../shared/types';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly repo: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization> {
    const org = await this.repo.findOne({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async updatePlan(id: string, plan: PlanTier, limits: Record<string, unknown>): Promise<Organization> {
    const org = await this.findById(id);
    org.plan = plan;
    org.planLimits = limits as Organization['planLimits'];
    return this.repo.save(org);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.repo.update(id, { isActive });
  }
}
