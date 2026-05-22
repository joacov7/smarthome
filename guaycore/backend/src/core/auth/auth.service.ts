import {
  Injectable, UnauthorizedException, ConflictException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { JwtPayload, UserRole, RequestContext } from '../../shared/types';
import { RegisterDto, LoginDto } from './dto/auth.dto';

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)         private usersRepo:  Repository<User>,
    @InjectRepository(Organization) private orgsRepo:   Repository<Organization>,
    private jwtService:  JwtService,
    private config:      ConfigService,
  ) {}

  // ── Registro de nueva organización + owner ─────────────────
  async register(dto: RegisterDto): Promise<TokenPair> {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const existingOrg = await this.orgsRepo.findOne({ where: { slug: dto.orgSlug } });
    if (existingOrg) throw new ConflictException('Slug de organización ya en uso');

    const org = await this.orgsRepo.save(
      this.orgsRepo.create({ name: dto.orgName, slug: dto.orgSlug })
    );

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        tenantId:     org.id,
        organization: org,
        email:        dto.email,
        firstName:    dto.email.split('@')[0],
        passwordHash,
        role:         UserRole.ORG_OWNER,
      })
    );

    this.logger.log(`Nueva org registrada: ${org.name} (${org.id})`);
    return this.issueTokens(user);
  }

  // ── Login ─────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string): Promise<TokenPair> {
    let user: User | null;

    if (dto.orgSlug) {
      const org = await this.orgsRepo.findOne({ where: { slug: dto.orgSlug } });
      if (!org) throw new UnauthorizedException('Organización no encontrada');
      user = await this.usersRepo.findOne({ where: { email: dto.email, tenantId: org.id, isActive: true } });
    } else {
      user = await this.usersRepo.findOne({ where: { email: dto.email, isActive: true } });
    }

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    await this.usersRepo.update(user.id, { lastLoginAt: new Date(), lastLoginIp: ip });

    return this.issueTokens(user);
  }

  // ── Refresh ────────────────────────────────────────────────
  async refresh(ctx: RequestContext, _refreshToken: string): Promise<TokenPair> {
    const user = await this.usersRepo.findOne({
      where: { id: ctx.userId, isActive: true },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.issueTokens(user);
  }

  // ── Validar payload JWT (usado por JwtStrategy) ─────────────
  async validateJwtPayload(payload: JwtPayload): Promise<JwtPayload | null> {
    // Acá se puede agregar blacklist de tokens (Redis)
    if (payload.type !== 'access') return null;
    return payload;
  }

  // ── Issue access + refresh tokens ─────────────────────────
  private issueTokens(user: User): TokenPair {
    const base: Omit<JwtPayload, 'type'> = {
      sub:      user.id,
      tenantId: user.tenantId,
      role:     user.role,
      email:    user.email,
    };

    const accessToken = this.jwtService.sign(
      { ...base, type: 'access' },
      {
        secret:    this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }
    );

    const refreshToken = this.jwtService.sign(
      { ...base, type: 'refresh' },
      {
        secret:    this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }
    );

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 min en segundos
  }
}
