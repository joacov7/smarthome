import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { Roles } from '../../shared/guards/roles.guard';
import { UserRole, PlanTier } from '../../shared/types';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener organización del tenant actual' })
  getMe(@TenantId() tenantId: string) {
    return this.svc.findById(tenantId);
  }

  @Patch(':id/plan')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar plan de la organización (admin)' })
  updatePlan(
    @Param('id') id: string,
    @Body() body: { plan: PlanTier; limits: Record<string, unknown> },
  ) {
    return this.svc.updatePlan(id, body.plan, body.limits);
  }

  @Patch(':id/active')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar organización (admin)' })
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.setActive(id, body.isActive);
  }
}
