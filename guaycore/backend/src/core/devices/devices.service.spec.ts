import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { DeviceStatus } from '../../shared/types';

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id:           'dev-1',
    tenantId:     'tenant-1',
    deviceKey:    'guay_abc123',
    deviceSecret: bcrypt.hashSync('plain_secret', 1),
    name:         'Sensor 1',
    status:       DeviceStatus.OFFLINE,
    isActive:     true,
    lastSeenAt:   undefined,
    remoteConfig: {},
    tags:         {},
    capabilities: [],
    ...overrides,
  } as Device;
}

function makeQb(result: Device[]) {
  const qb: any = {
    where:     jest.fn().mockReturnThis(),
    andWhere:  jest.fn().mockReturnThis(),
    orderBy:   jest.fn().mockReturnThis(),
    getMany:   jest.fn().mockResolvedValue(result),
    getOne:    jest.fn().mockResolvedValue(result[0] ?? null),
  };
  return qb;
}

async function buildService(opts: {
  findOneMock?:  jest.Mock;
  devicesMock?:  Device[];
}) {
  const devices     = opts.devicesMock ?? [];
  const findOneMock = opts.findOneMock ?? jest.fn().mockResolvedValue(devices[0] ?? null);
  const saveMock    = jest.fn().mockImplementation((d: Partial<Device>) => Promise.resolve({ ...d, id: 'dev-new' }));
  const createMock  = jest.fn().mockImplementation((dto: Partial<Device>) => dto as Device);
  const updateMock  = jest.fn().mockResolvedValue({ affected: 1 });
  const qbMock      = makeQb(devices);

  const repoMock = {
    findOne:              findOneMock,
    save:                 saveMock,
    create:               createMock,
    update:               updateMock,
    createQueryBuilder:   jest.fn().mockReturnValue(qbMock),
  };

  const mqttMock = { publish: jest.fn() };

  const mod = await Test.createTestingModule({
    providers: [
      DevicesService,
      { provide: getRepositoryToken(Device), useValue: repoMock },
      { provide: MqttService,                useValue: mqttMock },
    ],
  }).compile();

  return { svc: mod.get(DevicesService), mqtt: mqttMock, repo: repoMock };
}

// ==========================================================
describe('DevicesService', () => {

  // ── create ────────────────────────────────────────────
  describe('create()', () => {
    it('returns plainSecret only at creation time', async () => {
      const { svc } = await buildService({});
      const result = await svc.create('tenant-1', { name: 'New Device' });
      expect(result).toHaveProperty('plainSecret');
      expect(typeof result.plainSecret).toBe('string');
      expect(result.plainSecret.length).toBeGreaterThan(8);
    });

    it('generates different deviceKeys for each device', async () => {
      const { svc } = await buildService({});
      const [r1, r2] = await Promise.all([
        svc.create('tenant-1', { name: 'A' }),
        svc.create('tenant-1', { name: 'B' }),
      ]);
      expect(r1.deviceKey).not.toBe(r2.deviceKey);
    });

    it('stores hashed secret, not plain', async () => {
      const { svc, repo } = await buildService({});
      const result = await svc.create('tenant-1', { name: 'X' });
      const created = (repo.create as jest.Mock).mock.calls[0][0];
      expect(created.deviceSecret).not.toBe(result.plainSecret);
      const match = await bcrypt.compare(result.plainSecret, created.deviceSecret);
      expect(match).toBe(true);
    });
  });

  // ── findAll ───────────────────────────────────────────
  describe('findAll()', () => {
    it('returns all devices for tenant via queryBuilder', async () => {
      const devices = [makeDevice(), makeDevice({ id: 'dev-2', name: 'Sensor 2' })];
      const { svc } = await buildService({ devicesMock: devices });
      const result = await svc.findAll('tenant-1', {});
      expect(result).toHaveLength(2);
    });
  });

  // ── findOne ───────────────────────────────────────────
  describe('findOne()', () => {
    it('returns device when found', async () => {
      const device = makeDevice();
      const { svc } = await buildService({ findOneMock: jest.fn().mockResolvedValue(device) });
      const result = await svc.findOne('tenant-1', 'dev-1');
      expect(result.id).toBe('dev-1');
    });

    it('throws NotFoundException when not found', async () => {
      const { svc } = await buildService({ findOneMock: jest.fn().mockResolvedValue(null) });
      await expect(svc.findOne('tenant-1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── authenticateMqtt ──────────────────────────────────
  describe('authenticateMqtt()', () => {
    it('returns true for correct secret', async () => {
      const plain = 'my_plain_secret';
      const device = makeDevice({ deviceSecret: bcrypt.hashSync(plain, 1) });
      const { svc } = await buildService({ findOneMock: jest.fn().mockResolvedValue(device) });
      const ok = await svc.authenticateMqtt('guay_abc123', plain);
      expect(ok).toBe(true);
    });

    it('returns false for wrong secret', async () => {
      const device = makeDevice({ deviceSecret: bcrypt.hashSync('correct', 1) });
      const { svc } = await buildService({ findOneMock: jest.fn().mockResolvedValue(device) });
      const ok = await svc.authenticateMqtt('guay_abc123', 'wrong');
      expect(ok).toBe(false);
    });

    it('returns false when device not found', async () => {
      const { svc } = await buildService({ findOneMock: jest.fn().mockResolvedValue(null) });
      const ok = await svc.authenticateMqtt('nonexistent', 'any');
      expect(ok).toBe(false);
    });
  });

  // ── heartbeat ─────────────────────────────────────────
  describe('heartbeat()', () => {
    it('sets status to ONLINE', async () => {
      const { svc, repo } = await buildService({});
      await svc.heartbeat('dev-1', { firmwareVersion: '1.2.0' });
      expect(repo.update).toHaveBeenCalledWith('dev-1', expect.objectContaining({
        status: DeviceStatus.ONLINE,
      }));
    });
  });

  // ── markOffline ───────────────────────────────────────
  describe('markOffline()', () => {
    it('sets status to OFFLINE', async () => {
      const { svc, repo } = await buildService({});
      await svc.markOffline('dev-1');
      expect(repo.update).toHaveBeenCalledWith('dev-1', { status: DeviceStatus.OFFLINE });
    });
  });

  // ── pushConfig ────────────────────────────────────────
  describe('pushConfig()', () => {
    it('updates DB and publishes config via MQTT', async () => {
      const device = makeDevice();
      const { svc, mqtt } = await buildService({
        findOneMock: jest.fn().mockResolvedValue(device),
      });

      await svc.pushConfig('tenant-1', 'dev-1', { telemetryMs: 60000 });

      expect(mqtt.publish).toHaveBeenCalledWith(
        'tenant-1',
        device.deviceKey,
        'config',
        { telemetryMs: 60000 },
      );
    });
  });
});
