import {
  Controller, Get, Post, Patch, Delete, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule } from './entities/rule.entity';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { Roles } from '../../shared/guards/roles.guard';
import { UserRole } from '../../shared/types';

@ApiTags('rules')
@ApiBearerAuth()
@Controller('rules')
export class RulesController {
  constructor(
    @InjectRepository(Rule) private readonly repo: Repository<Rule>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar reglas del tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener regla por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Crear regla de automatización' })
  create(@TenantId() tenantId: string, @Body() body: Partial<Rule>) {
    const rule = this.repo.create({ ...body, tenantId });
    return this.repo.save(rule);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Actualizar regla' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: Partial<Rule>,
  ) {
    await this.repo.update({ id, tenantId }, body as any);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_OWNER)
  @ApiOperation({ summary: 'Eliminar regla' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.repo.delete({ id, tenantId });
  }
}
