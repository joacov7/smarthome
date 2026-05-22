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
import { JwtPayload, UserRole } from '../../shared/types';

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
  async register(dto: {
    orgName:   string;
    email:     string;
    password:  string;
    firstName: string;
    lastName?: string;
  }): Promise<TokenPair> {
    // Verificar email único dentro del sistema
    const exists = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email ya registrado');

    // Crear organización
    const slug = dto.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const org  = await this.orgsRepo.save(
      this.orgsRepo.create({ name: dto.orgName, slug: `${slug}-${Date.now()}` })
    );

    // Crear usuario owner
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        tenantId:     org.id,
        organization: org,
        email:        dto.email,
        firstName:    dto.firstName,
        lastName:     dto.lastName,
        passwordHash,
        role:         UserRole.ORG_OWNER,
      })
    );

    this.logger.log(`Nueva org registrada: ${org.name} (${org.id})`);
    return this.issueTokens(user);
  }

  // ── Login ─────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string): Promise<TokenPair> {
    const user = await this.usersRepo.findOne({ where: { email, isActive: true } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    // Audit
    await this.usersRepo.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    return this.issueTokens(user);
  }

  // ── Refresh ────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token type incorrecto');
    }

    const user = await this.usersRepo.findOne({
      where: { id: payload.sub, isActive: true },
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
        secret:    this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
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
