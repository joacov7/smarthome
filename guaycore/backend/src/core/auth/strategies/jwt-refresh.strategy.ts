import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload, RequestContext } from '../../../shared/types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(_req: Request, payload: JwtPayload): RequestContext {
    if (!payload.sub || !payload.tenantId) throw new UnauthorizedException();
    return {
      userId:   payload.sub,
      tenantId: payload.tenantId,
      email:    payload.email,
      role:     payload.role,
    };
  }
}
