import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto/auth.dto';
import { Public } from '../../shared/decorators/public.decorator';
import { CurrentUser } from '../../shared/decorators/tenant.decorator';
import { RequestContext } from '../../shared/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar organización y primer usuario admin' })
  register(@Body() dto: RegisterDto) {
    return this.svc.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener access + refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.svc.login(dto);
  }

  @Post('refresh')
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  refresh(@CurrentUser() ctx: RequestContext, @Body() _dto: RefreshDto) {
    return this.svc.refresh(ctx, _dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidar sesión (client-side token discard)' })
  logout() {
    return;
  }
}
