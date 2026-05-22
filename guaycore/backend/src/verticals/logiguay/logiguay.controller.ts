import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '../../shared/decorators/tenant.decorator';

@ApiTags('vertical/logiguay')
@ApiBearerAuth()
@Controller('logiguay')
export class LogiguayController {
  @Get('health')
  @ApiOperation({ summary: 'Logiguay vertical health check' })
  health(@TenantId() _tenantId: string) {
    return { vertical: 'logiguay', status: 'active' };
  }
}
