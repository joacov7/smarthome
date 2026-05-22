import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeDevice } from './entities/home-device.entity';

export interface AssignHomeDeviceDto {
  roomId?: string;
  displayName?: string;
  icon?: string;
  sortOrder?: number;
  capabilities?: string[];
}

@Injectable()
export class HomeDevicesService {
  constructor(
    @InjectRepository(HomeDevice) private readonly repo: Repository<HomeDevice>,
  ) {}

  /**
   * List all home-devices for a tenant, optionally filtered by roomId.
   */
  findAll(tenantId: string, roomId?: string): Promise<HomeDevice[]> {
    const where: Record<string, unknown> = { tenantId };
    if (roomId !== undefined) where.roomId = roomId;

    return this.repo.find({
      where: where as any,
      order: { sortOrder: 'ASC' },
      relations: ['room'],
    });
  }

  /**
   * Upsert a device assignment for the given core deviceId.
   * If the device is not yet assigned to the home vertical, creates a new record.
   * If it is already assigned, updates the existing record.
   */
  async assign(tenantId: string, deviceId: string, dto: AssignHomeDeviceDto): Promise<HomeDevice> {
    let homeDevice = await this.repo.findOne({ where: { tenantId, deviceId } });

    if (!homeDevice) {
      homeDevice = this.repo.create({ tenantId, deviceId });
    }

    if (dto.roomId        !== undefined) homeDevice.roomId      = dto.roomId;
    if (dto.displayName   !== undefined) homeDevice.displayName = dto.displayName;
    if (dto.icon          !== undefined) homeDevice.icon        = dto.icon;
    if (dto.sortOrder     !== undefined) homeDevice.sortOrder   = dto.sortOrder;
    if (dto.capabilities  !== undefined) homeDevice.capabilities = dto.capabilities;

    return this.repo.save(homeDevice);
  }

  /**
   * Remove the home-vertical assignment for the given core deviceId.
   */
  async unassign(tenantId: string, deviceId: string): Promise<void> {
    const homeDevice = await this.repo.findOne({ where: { tenantId, deviceId } });
    if (!homeDevice) throw new NotFoundException(`Device ${deviceId} is not assigned to GuayHome`);
    await this.repo.remove(homeDevice);
  }
}
