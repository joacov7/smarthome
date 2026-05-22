import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserRole } from '../../shared/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findById(tenantId: string, id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.repo.findOne({ where: { tenantId, email } });
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async updateRole(tenantId: string, id: string, role: UserRole): Promise<User> {
    const user = await this.findById(tenantId, id);
    user.role = role;
    return this.repo.save(user);
  }

  async changePassword(tenantId: string, id: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 12);
    await this.repo.update({ id, tenantId }, { passwordHash: hash });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
