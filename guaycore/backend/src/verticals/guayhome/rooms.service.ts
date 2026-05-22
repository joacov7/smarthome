import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';

export interface CreateRoomDto {
  name: string;
  floor?: number;
  icon?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateRoomDto {
  name?: string;
  floor?: number;
  icon?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly repo: Repository<Room>,
  ) {}

  findAll(tenantId: string): Promise<Room[]> {
    return this.repo.find({
      where: { tenantId },
      order: { floor: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Room> {
    const room = await this.repo.findOne({ where: { id, tenantId } });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  create(tenantId: string, dto: CreateRoomDto): Promise<Room> {
    return this.repo.save(
      this.repo.create({
        tenantId,
        name:      dto.name,
        floor:     dto.floor     ?? 0,
        icon:      dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        metadata:  dto.metadata  ?? {},
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(tenantId, id);
    Object.assign(room, dto);
    return this.repo.save(room);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const room = await this.findOne(tenantId, id);
    await this.repo.remove(room);
  }
}
