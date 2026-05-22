import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirmwareVersion, OtaCampaign, OtaStatus } from './entities/firmware.entity';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class OtaService {
  constructor(
    @InjectRepository(FirmwareVersion) private fwRepo:       Repository<FirmwareVersion>,
    @InjectRepository(OtaCampaign)     private campaignRepo: Repository<OtaCampaign>,
    private readonly mqtt: MqttService,
  ) {}

  // ── Firmware ────────────────────────────────────────────────

  async listFirmware(tenantId: string): Promise<FirmwareVersion[]> {
    return this.fwRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async createFirmware(tenantId: string, dto: {
    version:       string;
    hardwareModel?: string;
    downloadUrl:   string;
    sha256:        string;
    sizeBytes:     number;
    changelog?:    string;
    isStable?:     boolean;
  }): Promise<FirmwareVersion> {
    return this.fwRepo.save(this.fwRepo.create({ tenantId, ...dto }));
  }

  // ── Campaigns ───────────────────────────────────────────────

  async listCampaigns(tenantId: string): Promise<OtaCampaign[]> {
    return this.campaignRepo.find({
      where: { tenantId },
      relations: ['firmwareVersion'],
      order: { createdAt: 'DESC' },
    });
  }

  async createCampaign(tenantId: string, dto: {
    name:              string;
    firmwareVersionId: string;
    targetFilter:      Record<string, unknown>;
  }): Promise<OtaCampaign> {
    const fw = await this.fwRepo.findOne({ where: { id: dto.firmwareVersionId, tenantId } });
    if (!fw) throw new NotFoundException('Firmware version not found');

    return this.campaignRepo.save(this.campaignRepo.create({
      tenantId,
      name:              dto.name,
      firmwareVersion:   fw,
      targetFilter:      dto.targetFilter,
    }));
  }

  async activateCampaign(tenantId: string, id: string): Promise<OtaCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, tenantId },
      relations: ['firmwareVersion'],
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== OtaStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be activated');
    }

    campaign.status = OtaStatus.ACTIVE;
    const saved = await this.campaignRepo.save(campaign);

    // Notify devices via MQTT broadcast — devices matching targetFilter will
    // check version and decide whether to update
    this.mqtt.publishBroadcast(tenantId, 'ota/update', {
      campaignId:  id,
      version:     campaign.firmwareVersion.version,
      downloadUrl: campaign.firmwareVersion.downloadUrl,
      sha256:      campaign.firmwareVersion.sha256,
      sizeBytes:   campaign.firmwareVersion.sizeBytes,
      filter:      campaign.targetFilter,
    });

    return saved;
  }

  async pauseCampaign(tenantId: string, id: string): Promise<void> {
    await this.campaignRepo.update({ id, tenantId }, { status: OtaStatus.PAUSED });
  }
}
