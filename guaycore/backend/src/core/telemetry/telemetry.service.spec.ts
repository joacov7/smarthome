import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TelemetryService } from './telemetry.service';
import { Telemetry } from './entities/telemetry.entity';
import { RulesEngine } from '../rules/rules.engine';

async function buildService(opts: {
  findOne?: jest.Mock;
  find?:    jest.Mock;
  query?:   jest.Mock;
}) {
  const dsQueryMock = opts.query ?? jest.fn().mockResolvedValue([{ count: 5, first_ts: new Date(), last_ts: new Date() }]);

  const mod = await Test.createTestingModule({
    providers: [
      TelemetryService,
      {
        provide: getRepositoryToken(Telemetry),
        useValue: {
          findOne: opts.findOne ?? jest.fn().mockResolvedValue(null),
          find:    opts.find    ?? jest.fn().mockResolvedValue([]),
        },
      },
      {
        provide: getDataSourceToken(),
        useValue: { query: dsQueryMock },
      },
      {
        provide: RulesEngine,
        useValue: { evaluate: jest.fn().mockResolvedValue(undefined) },
      },
      {
        provide: EventEmitter2,
        useValue: { emit: jest.fn() },
      },
    ],
  }).compile();

  return {
    svc:     mod.get(TelemetryService),
    dsQuery: dsQueryMock,
    emitter: mod.get(EventEmitter2),
    rules:   mod.get(RulesEngine),
  };
}

// ==========================================================
describe('TelemetryService', () => {

  // ── ingest ────────────────────────────────────────────
  describe('ingest()', () => {
    it('runs without throwing for valid payload', async () => {
      const { svc } = await buildService({
        query: jest.fn().mockResolvedValue([]),
      });

      await expect(svc.ingest({
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        payload:  { temp: 25.3, humidity: 60 },
      })).resolves.toBeUndefined();
    });

    it('uses provided ts from payload', async () => {
      const dsQuery = jest.fn().mockResolvedValue([]);
      const { svc } = await buildService({ query: dsQuery });
      const ts = '2024-06-01T12:00:00Z';

      await svc.ingest({
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        payload:  { ts, temp: 20 },
      });

      expect(dsQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO telemetry'),
        expect.arrayContaining([new Date(ts)]),
      );
    });

    it('emits telemetry.received event', async () => {
      const { svc, emitter } = await buildService({
        query: jest.fn().mockResolvedValue([]),
      });

      await svc.ingest({ tenantId: 't', deviceId: 'd', payload: { x: 1 } });
      expect(emitter.emit).toHaveBeenCalledWith(
        'telemetry.received',
        expect.objectContaining({ tenantId: 't', deviceId: 'd' }),
      );
    });

    it('calls RulesEngine.evaluate asynchronously', async () => {
      const { svc, rules } = await buildService({
        query: jest.fn().mockResolvedValue([]),
      });

      await svc.ingest({ tenantId: 't', deviceId: 'd', payload: { v: 42 } });
      // Give async evaluation a tick to start
      await new Promise(r => setTimeout(r, 0));
      expect(rules.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't', deviceId: 'd', data: { v: 42 } }),
      );
    });
  });

  // ── latest ────────────────────────────────────────────
  describe('latest()', () => {
    it('returns the latest record', async () => {
      const record = { ts: new Date(), deviceId: 'd', tenantId: 't', data: { temp: 22 } } as Telemetry;
      const { svc } = await buildService({ findOne: jest.fn().mockResolvedValue(record) });

      const result = await svc.latest({ tenantId: 't', deviceId: 'd' });
      expect(result).toEqual(record);
    });

    it('returns null when no records', async () => {
      const { svc } = await buildService({ findOne: jest.fn().mockResolvedValue(null) });
      const result = await svc.latest({ tenantId: 't', deviceId: 'd' });
      expect(result).toBeNull();
    });
  });

  // ── summary ───────────────────────────────────────────
  describe('summary()', () => {
    it('returns count, firstTs, lastTs from raw query', async () => {
      const now = new Date();
      const { svc } = await buildService({
        query: jest.fn().mockResolvedValue([{ count: 42, first_ts: now, last_ts: now }]),
      });

      const result = await svc.summary('t', 'd', new Date(Date.now() - 86_400_000));
      expect(result.count).toBe(42);
      expect(result.firstTs).toEqual(now);
      expect(result.lastTs).toEqual(now);
    });

    it('returns zero count when no data', async () => {
      const { svc } = await buildService({
        query: jest.fn().mockResolvedValue([{ count: 0, first_ts: null, last_ts: null }]),
      });

      const result = await svc.summary('t', 'd', new Date());
      expect(result.count).toBe(0);
      expect(result.firstTs).toBeNull();
    });
  });

  // ── query ─────────────────────────────────────────────
  describe('query()', () => {
    it('returns time-range records', async () => {
      const records = [
        { ts: new Date(), deviceId: 'd', tenantId: 't', data: {} },
      ] as Telemetry[];

      const { svc } = await buildService({ find: jest.fn().mockResolvedValue(records) });

      const result = await svc.query({
        tenantId: 't',
        deviceId: 'd',
        from:     new Date(Date.now() - 3600_000),
        to:       new Date(),
        limit:    100,
      });
      expect(result).toHaveLength(1);
    });
  });
});
