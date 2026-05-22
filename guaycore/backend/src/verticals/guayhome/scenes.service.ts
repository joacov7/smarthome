import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scene, SceneAction } from './entities/scene.entity';
import { MqttService } from '../../core/mqtt/mqtt.service';

export interface CreateSceneDto {
  name: string;
  icon?: string;
  actions?: SceneAction[];
  isActive?: boolean;
}

export interface UpdateSceneDto {
  name?: string;
  icon?: string;
  actions?: SceneAction[];
  isActive?: boolean;
}

@Injectable()
export class ScenesService {
  private readonly logger = new Logger(ScenesService.name);

  constructor(
    @InjectRepository(Scene) private readonly repo: Repository<Scene>,
  ) {}

  findAll(tenantId: string): Promise<Scene[]> {
    return this.repo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Scene> {
    const scene = await this.repo.findOne({ where: { id, tenantId } });
    if (!scene) throw new NotFoundException(`Scene ${id} not found`);
    return scene;
  }

  create(tenantId: string, dto: CreateSceneDto): Promise<Scene> {
    return this.repo.save(
      this.repo.create({
        tenantId,
        name:     dto.name,
        icon:     dto.icon,
        actions:  dto.actions  ?? [],
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateSceneDto): Promise<Scene> {
    const scene = await this.findOne(tenantId, id);
    Object.assign(scene, dto);
    return this.repo.save(scene);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const scene = await this.findOne(tenantId, id);
    await this.repo.remove(scene);
  }

  /**
   * Execute a scene: iterate over actions and publish MQTT commands.
   * Respects optional per-action delayMs by awaiting a promise before
   * publishing the next action.
   */
  async execute(tenantId: string, sceneId: string, mqttService: MqttService): Promise<{ executed: number }> {
    const scene = await this.findOne(tenantId, sceneId);

    if (!scene.isActive) {
      this.logger.warn(`Scene ${sceneId} is inactive — skipping execution`);
      return { executed: 0 };
    }

    this.logger.log(`Executing scene "${scene.name}" (${scene.actions.length} actions) tenant=${tenantId}`);

    let executed = 0;

    for (const action of scene.actions) {
      if (action.delayMs && action.delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, action.delayMs));
      }

      mqttService.publish(tenantId, action.deviceId, 'commands', action.command);
      executed++;

      this.logger.debug(`Scene ${sceneId} → device=${action.deviceId} command=${JSON.stringify(action.command)}`);
    }

    return { executed };
  }
}
