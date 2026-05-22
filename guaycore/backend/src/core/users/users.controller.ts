import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { Roles } from '../../shared/guards/roles.guard';
import { UserRole } from '../../shared/types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Listar usuarios del tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.svc.findAll(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Patch(':id/role')
  @Roles(UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Cambiar rol de un usuario' })
  updateRole(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { role: UserRole },
  ) {
    return this.svc.updateRole(tenantId, id, body.role);
  }

  @Patch(':id/password')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Cambiar contraseña de usuario' })
  changePassword(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.svc.changePassword(tenantId, id, body.password);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }
}
