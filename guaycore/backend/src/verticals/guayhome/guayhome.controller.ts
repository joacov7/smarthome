import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '../../shared/decorators/tenant.decorator';

@ApiTags('vertical/guayhome')
@ApiBearerAuth()
@Controller('guayhome')
export class GuayHomeController {
  @Get('health')
  @ApiOperation({ summary: 'GuayHome vertical health check' })
  health(@TenantId() _tenantId: string) {
    return { vertical: 'guayhome', status: 'active' };
  }
}
