import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserRole } from '../../shared/types';

// ── Factories ─────────────────────────────────────────────
function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return { id: 'org-1', slug: 'acme', name: 'Acme', isActive: true, ...overrides } as Organization;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id:           'user-1',
    tenantId:     'org-1',
    email:        'admin@acme.com',
    passwordHash: bcrypt.hashSync('secret123', 1),
    role:         UserRole.ORG_OWNER,
    isActive:     true,
    firstName:    'Admin',
    ...overrides,
  } as User;
}

// ── Module builder ────────────────────────────────────────
async function buildModule(
  userFindOne: jest.Mock,
  orgFindOne:  jest.Mock,
) {
  const userSave   = jest.fn().mockImplementation((u: User) => Promise.resolve({ ...u, id: 'user-new' }));
  const orgSave    = jest.fn().mockImplementation((o: Organization) => Promise.resolve({ ...o, id: 'org-new' }));
  const userCreate = jest.fn().mockImplementation((dto: Partial<User>) => dto as User);
  const orgCreate  = jest.fn().mockImplementation((dto: Partial<Organization>) => dto as Organization);
  const userUpdate = jest.fn().mockResolvedValue(undefined);

  const mod = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: getRepositoryToken(User),
        useValue: { findOne: userFindOne, save: userSave, create: userCreate, update: userUpdate },
      },
      {
        provide: getRepositoryToken(Organization),
        useValue: { findOne: orgFindOne, save: orgSave, create: orgCreate },
      },
      {
        provide: JwtService,
        useValue: { sign: jest.fn().mockReturnValue('signed-token') },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('secret'), getOrThrow: jest.fn().mockReturnValue('secret') },
      },
    ],
  }).compile();

  return mod.get(AuthService);
}

// ==========================================================
describe('AuthService', () => {

  // ── register ──────────────────────────────────────────
  describe('register()', () => {
    it('creates org + user and returns token pair', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(null),       // no existing user
        jest.fn().mockResolvedValue(null),       // slug not taken
      );

      const result = await svc.register({
        orgName:  'Acme Corp',
        orgSlug:  'acme-test',
        email:    'new@acme.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(900);
    });

    it('throws ConflictException when email already exists', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(makeUser()),   // email found
        jest.fn().mockResolvedValue(null),
      );

      await expect(
        svc.register({ orgName: 'X', orgSlug: 'x', email: 'admin@acme.com', password: 'password123' })
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when slug already exists', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(null),
        jest.fn().mockResolvedValue(makeOrg()),   // slug found
      );

      await expect(
        svc.register({ orgName: 'X', orgSlug: 'acme', email: 'new@acme.com', password: 'pass1234' })
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────
  describe('login()', () => {
    it('returns tokens on valid credentials', async () => {
      const user = makeUser();
      const svc = await buildModule(
        jest.fn().mockResolvedValue(user),
        jest.fn().mockResolvedValue(null),
      );

      const result = await svc.login({ email: 'admin@acme.com', password: 'secret123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const user = makeUser();
      const svc = await buildModule(
        jest.fn().mockResolvedValue(user),
        jest.fn().mockResolvedValue(null),
      );

      await expect(
        svc.login({ email: 'admin@acme.com', password: 'wrongpassword' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(null),   // user not found
        jest.fn().mockResolvedValue(null),
      );

      await expect(
        svc.login({ email: 'ghost@acme.com', password: 'any' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('resolves by org slug when orgSlug is provided', async () => {
      const org  = makeOrg();
      const user = makeUser();
      const svc = await buildModule(
        jest.fn().mockResolvedValue(user),
        jest.fn().mockResolvedValue(org),     // slug resolves org
      );

      const result = await svc.login({ email: 'admin@acme.com', password: 'secret123', orgSlug: 'acme' });
      expect(result).toHaveProperty('accessToken');
    });

    it('throws when orgSlug not found', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(null),
        jest.fn().mockResolvedValue(null),    // org not found
      );

      await expect(
        svc.login({ email: 'admin@acme.com', password: 'secret123', orgSlug: 'nonexistent' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────
  describe('refresh()', () => {
    it('issues new token pair for active user', async () => {
      const user = makeUser();
      const svc = await buildModule(
        jest.fn().mockResolvedValue(user),
        jest.fn().mockResolvedValue(null),
      );

      const ctx = { userId: 'user-1', tenantId: 'org-1', email: 'admin@acme.com', role: UserRole.ORG_OWNER };
      const result = await svc.refresh(ctx, 'any-refresh-token');
      expect(result).toHaveProperty('accessToken');
    });

    it('throws when user is inactive', async () => {
      const svc = await buildModule(
        jest.fn().mockResolvedValue(null),    // findOne returns null
        jest.fn().mockResolvedValue(null),
      );

      const ctx = { userId: 'user-gone', tenantId: 'org-1', email: 'x@y.com', role: UserRole.ORG_OWNER };
      await expect(svc.refresh(ctx, 'token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
