import {
  Controller, Get, Post, Patch, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OtaService } from './ota.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { Roles } from '../../shared/guards/roles.guard';
import { UserRole } from '../../shared/types';

@ApiTags('ota')
@ApiBearerAuth()
@Controller('ota')
export class OtaController {
  constructor(private readonly svc: OtaService) {}

  // ── Firmware versions ────────────────────────────────────

  @Get('firmware')
  @ApiOperation({ summary: 'Listar versiones de firmware del tenant' })
  listFirmware(@TenantId() tenantId: string) {
    return this.svc.listFirmware(tenantId);
  }

  @Post('firmware')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Registrar nueva versión de firmware' })
  createFirmware(
    @TenantId() tenantId: string,
    @Body() dto: {
      version:       string;
      hardwareModel?: string;
      downloadUrl:   string;
      sha256:        string;
      sizeBytes:     number;
      changelog?:    string;
      isStable?:     boolean;
    },
  ) {
    return this.svc.createFirmware(tenantId, dto);
  }

  // ── Campaigns ─────────────────────────────────────────────

  @Get('campaigns')
  @ApiOperation({ summary: 'Listar campañas OTA del tenant' })
  listCampaigns(@TenantId() tenantId: string) {
    return this.svc.listCampaigns(tenantId);
  }

  @Post('campaigns')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Crear campaña OTA' })
  createCampaign(
    @TenantId() tenantId: string,
    @Body() dto: { name: string; firmwareVersionId: string; targetFilter: Record<string, unknown> },
  ) {
    return this.svc.createCampaign(tenantId, dto);
  }

  @Patch('campaigns/:id/activate')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Activar campaña y notificar dispositivos via MQTT' })
  activate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.activateCampaign(tenantId, id);
  }

  @Patch('campaigns/:id/pause')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Pausar campaña OTA activa' })
  pause(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.pauseCampaign(tenantId, id);
  }
}
